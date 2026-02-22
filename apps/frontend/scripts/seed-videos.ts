import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// R2 Credentials
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;

if (!supabaseUrl || !supabaseKey || !r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
  console.error('Error: Missing environment variables.');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
});

async function fetchAllR2Keys(bucket: string, prefix: string) {
  let continuationToken: string | undefined = undefined;
  const keys: string[] = [];

  console.log(`📡 Fetching objects from R2 bucket: ${bucket} (prefix: ${prefix})...`);

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command) as ListObjectsV2CommandOutput;

    if (response.Contents) {
      for (const item of response.Contents) {
        // Filter out the folder itself if returned
        if (item.Key && item.Key !== prefix && !item.Key.endsWith('/')) {
          keys.push(item.Key);
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`✅ Found ${keys.length} files in R2.`);
  return keys;
}

async function seed() {
  try {
    const keys = await fetchAllR2Keys(r2BucketName!, 'clips/');

    if (keys.length === 0) {
      console.log('No videos found to insert.');
      return;
    }

    const videosToInsert = keys.map((key) => {
      const filename = path.basename(key); // e.g., "A1.mp4" from "clips/A1.mp4"
      
      return {
        video_url: key, // e.g., "clips/A1.mp4"
        title: `Scenario ${filename}`, // Placeholder title
        topic: 'Uncategorized',
        correct_action: 'TBD',
        correct_sanction: 'TBD',
        is_active: false, // Set to false initially so they can be reviewed
        description: 'Imported automatically from R2',
      };
    });

    console.log(`💾 Upserting ${videosToInsert.length} rows to Supabase...`);
  
    // Upsert in batches of 100 to be safe, though Supabase handles large bodies well
    const batchSize = 100;
    for (let i = 0; i < videosToInsert.length; i += batchSize) {
      const batch = videosToInsert.slice(i, i + batchSize);
      
      const { error } = await supabase
    .from('video_scenarios')
        .upsert(batch, { 
          onConflict: 'video_url',
          ignoreDuplicates: true // Only insert if it doesn't exist
        });

      if (error) {
        console.error(`❌ Error inserting batch ${i}-${i + batchSize}:`, error.message);
      } else {
        console.log(`✨ Processed batch ${i}-${i + batchSize}`);
      }
    }

    console.log('🏁 Seed process completed.');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

seed();