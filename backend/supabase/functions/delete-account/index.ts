import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleDeleteAccountRequest } from "../_shared/accountDeletionWorkflow.ts";

serve(handleDeleteAccountRequest);
