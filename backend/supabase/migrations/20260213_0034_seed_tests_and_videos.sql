-- 20260213_0034_seed_tests_and_videos.sql
-- Seeds tests, questions, and video scenarios with realistic refereeing content.

-- ============================================
-- 1. TESTS (one per topic)
-- ============================================

insert into public.tests (slug, title, topic, is_active) values
  ('offside-fundamentals',   'Offside Fundamentals',     'Offside',    true),
  ('fouls-and-misconduct',   'Fouls & Misconduct',       'Fouls',      true),
  ('handball-decisions',     'Handball Decisions',        'Handball',   true),
  ('penalty-situations',     'Penalty Situations',        'Penalties',  true),
  ('advantage-application',  'Advantage Application',     'Advantage',  true),
  ('cards-and-discipline',   'Cards & Discipline',        'Cards',      true),
  ('var-protocol',           'VAR Protocol',              'VAR',        true),
  ('free-kicks-basics',      'Free Kicks Basics',         'Free Kicks', true),
  ('general-laws',           'General Laws of the Game',  'General',    true)
on conflict (slug) do nothing;

-- ============================================
-- 2. QUESTIONS — Offside Fundamentals
-- ============================================

insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
from public.tests t
cross join (values
  (1, 'A player is in an offside position. When is the offence penalised?',
    'As soon as they are in an offside position',
    'When they become involved in active play',
    'When the ball crosses the halfway line',
    'When any teammate touches the ball',
    'B'),
  (2, 'Which body parts are used to determine offside position?',
    'Any part of the body including hands and arms',
    'Any part of the body that can legally play the ball',
    'Only the feet',
    'Head, body, and feet only',
    'B'),
  (3, 'A player receives the ball directly from a goal kick. Can they be offside?',
    'Yes, offside applies on all restarts',
    'No, there is no offside from a goal kick',
    'Only if they are in the penalty area',
    'Only if the goalkeeper takes the goal kick',
    'B'),
  (4, 'An attacker is level with the second-last defender. Are they offside?',
    'Yes, level is offside',
    'No, level is onside',
    'Only if the ball is in the air',
    'It depends on the phase of play',
    'B'),
  (5, 'A player in an offside position deliberately prevents the goalkeeper from playing the ball. What is the decision?',
    'Indirect free kick for offside',
    'Corner kick',
    'Drop ball',
    'Direct free kick and possible caution',
    'A'),
  (6, 'Can a player be offside from a throw-in?',
    'Yes, standard offside rules apply',
    'No, there is no offside offence from a throw-in',
    'Only in the attacking half',
    'Only in the penalty area',
    'B'),
  (7, 'An attacker in an offside position runs towards the ball but a teammate in an onside position plays it. What is the decision?',
    'Offside — the attacker impacted the play',
    'Play on — the onside player played the ball',
    'It depends on whether the offside player touched the ball',
    'It depends on whether the offside player was in the opponents half',
    'C'),
  (8, 'A defender deliberately steps off the field to place an attacker in an offside position. What should the referee do?',
    'Award offside',
    'Allow play to continue and caution the defender at the next stoppage',
    'Stop play immediately and caution the defender',
    'Award an indirect free kick to the attacking team',
    'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'offside-fundamentals'
on conflict (test_id, order_index) do nothing;

-- ============================================
-- 3. QUESTIONS — Fouls & Misconduct
-- ============================================

insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
from public.tests t
cross join (values
  (1, 'What type of free kick is awarded for a direct free kick offence committed inside the offenders penalty area?',
    'Indirect free kick',
    'Direct free kick on the penalty area line',
    'Penalty kick',
    'Drop ball',
    'C'),
  (2, 'A player uses excessive force when challenging an opponent. What is the minimum sanction?',
    'Caution (yellow card)',
    'Sending off (red card)',
    'Indirect free kick only',
    'Verbal warning',
    'B'),
  (3, 'Which of the following is NOT a direct free kick offence?',
    'Kicking an opponent',
    'Pushing an opponent',
    'Playing in a dangerous manner',
    'Tripping an opponent',
    'C'),
  (4, 'A player commits a reckless challenge. What is the correct sanction?',
    'No card, just a free kick',
    'Caution (yellow card)',
    'Sending off (red card)',
    'Verbal warning',
    'B'),
  (5, 'An attacker is fouled simultaneously by two defenders in the penalty area. How many penalty kicks are awarded?',
    'Two penalty kicks',
    'One penalty kick',
    'One penalty kick and a caution for each defender',
    'Indirect free kick',
    'B'),
  (6, 'A player tackles from behind and makes contact with the ball first, then the opponent falls. What is the decision?',
    'Always a foul',
    'It depends on whether the tackle was careless, reckless, or with excessive force',
    'Never a foul if ball is played first',
    'Indirect free kick',
    'B'),
  (7, 'What restart is given when a player impedes the progress of an opponent without any contact?',
    'Direct free kick',
    'Indirect free kick',
    'Drop ball',
    'No foul — play continues',
    'B'),
  (8, 'A goalkeeper handles the ball outside their penalty area. What is the decision?',
    'Indirect free kick',
    'Direct free kick',
    'Penalty kick',
    'Drop ball',
    'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'fouls-and-misconduct'
on conflict (test_id, order_index) do nothing;

-- ============================================
-- 4. QUESTIONS — Handball Decisions
-- ============================================

insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
from public.tests t
cross join (values
  (1, 'A player scores a goal immediately after the ball accidentally hits their hand. What is the decision?',
    'Goal stands — it was accidental',
    'No goal — handball offence even if accidental',
    'Goal stands only if the player did not move their hand',
    'It depends on the referee''s judgement',
    'B'),
  (2, 'A defender in the wall jumps and the ball hits their arm which is by their side. Is it handball?',
    'Yes, always',
    'No, if the arm is in a natural position close to the body',
    'Yes, because it stopped a goal-scoring opportunity',
    'Only if the referee deems it intentional',
    'B'),
  (3, 'A player makes their body unnaturally bigger with their arm and blocks a cross. What is the decision?',
    'Play on — no offence',
    'Indirect free kick',
    'Direct free kick or penalty',
    'Drop ball',
    'C'),
  (4, 'The ball hits a player''s hand that is supporting their body while on the ground. Is it handball?',
    'Yes, always a handball',
    'No, the hand is supporting the body in a natural way',
    'Only if they scored from it',
    'Only in the penalty area',
    'B'),
  (5, 'An attacker''s teammate handles the ball, then the attacker scores in a subsequent phase of play. What is the decision?',
    'Goal stands — it was a different player',
    'No goal — handball in the build-up',
    'Goal stands if several passes occurred after the handball',
    'No goal only if the handball was deliberate',
    'B'),
  (6, 'A player deliberately handles the ball to prevent a goal. What is the sanction?',
    'Caution (yellow card) and penalty',
    'Sending off (red card) and penalty',
    'Direct free kick only',
    'Indirect free kick and caution',
    'B'),
  (7, 'The ball rebounds off a player''s foot onto their own arm from very close range. Is this handball?',
    'Yes — arm contact is always penalised',
    'No — the ball came from the player''s own body at close range',
    'Only if it led to a goal',
    'Only outside the penalty area',
    'B'),
  (8, 'Where does the arm begin for handball decisions according to IFAB?',
    'At the wrist',
    'At the elbow',
    'At the bottom of the armpit',
    'At the shoulder joint',
    'C')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'handball-decisions'
on conflict (test_id, order_index) do nothing;

-- ============================================
-- 5. QUESTIONS — Penalty Situations
-- ============================================

insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
from public.tests t
cross join (values
  (1, 'During a penalty kick, the goalkeeper moves off the goal line before the ball is kicked and saves the shot. What is the decision?',
    'Goal kick',
    'Retake the penalty kick',
    'Indirect free kick to the defending team',
    'Play continues',
    'B'),
  (2, 'A penalty kick hits the post and rebounds to the kicker who scores. What is the decision?',
    'Goal stands',
    'No goal — the kicker cannot touch the ball twice',
    'Retake the penalty',
    'Indirect free kick to the defending team',
    'B'),
  (3, 'Both teams commit infringements during a penalty kick. What is the decision?',
    'Goal stands if scored',
    'Retake the penalty kick',
    'Indirect free kick to the defending team',
    'Drop ball',
    'B'),
  (4, 'Where exactly must the ball be placed for a penalty kick?',
    'Anywhere within the penalty area',
    'On the penalty mark',
    'On the penalty area line',
    'Within 1 metre of the penalty mark',
    'B'),
  (5, 'An attacker enters the penalty area before the kick and scores from the rebound. What is the decision?',
    'Goal stands',
    'Retake the penalty',
    'No goal — indirect free kick to the defending team',
    'No goal — the penalty is retaken',
    'D'),
  (6, 'The goalkeeper and an attacker both infringe during a penalty kick that is scored. What is the decision?',
    'Goal stands',
    'Retake the penalty',
    'Indirect free kick to defending team',
    'Goal kick',
    'B'),
  (7, 'Can the referee award a penalty kick after the final whistle has blown?',
    'No, never',
    'Yes, if the foul occurred before the whistle',
    'Only in extra time',
    'Only if VAR reviews it',
    'B'),
  (8, 'A teammate of the kicker takes the penalty instead after the referee has confirmed the kicker. What happens?',
    'If a goal is scored, it is disallowed and the correct kicker retakes',
    'The incorrect kicker is cautioned and an indirect free kick is awarded',
    'The goal stands regardless',
    'Retake with any player',
    'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'penalty-situations'
on conflict (test_id, order_index) do nothing;

-- ============================================
-- 6. QUESTIONS — Advantage Application
-- ============================================

insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
from public.tests t
cross join (values
  (1, 'A player is fouled but their teammate gains possession and attacks. The referee plays advantage. The attack breaks down 5 seconds later. What should the referee do?',
    'Go back and award the free kick',
    'Play continues — advantage has been played',
    'Award a drop ball',
    'Award the free kick only if a card is needed',
    'B'),
  (2, 'Can advantage be applied for a sending-off offence?',
    'No, play must always be stopped for a red card',
    'Yes, but the player must still be sent off at the next stoppage',
    'Only in the attacking third',
    'Only if a goal is scored',
    'B'),
  (3, 'How long does a referee typically wait before deciding if advantage has materialised?',
    'Exactly 5 seconds',
    'Until the next pass',
    'A few seconds — it depends on the situation',
    '10 seconds maximum',
    'C'),
  (4, 'The referee signals advantage but the fouled player immediately loses the ball. What should happen?',
    'Play continues',
    'The referee stops play and awards the original free kick',
    'Drop ball',
    'The referee cannot go back once advantage is signalled',
    'B'),
  (5, 'A defender commits a cautionable foul in their own half. The attacker keeps the ball and continues. Should the referee still caution the defender?',
    'No, advantage removes the card',
    'Yes, the caution is still given at the next stoppage',
    'Only if the attack results in a goal',
    'Only if the foul was reckless',
    'B'),
  (6, 'Can advantage be applied inside the penalty area?',
    'No, a penalty must always be awarded',
    'Yes, if the attacking team has a clear advantage',
    'Only if the ball is already heading into the goal',
    'Never — the penalty area is a special zone',
    'B'),
  (7, 'A foul is committed and the referee plays advantage. A goal is scored directly from the advantage. What happens to the card?',
    'No card — the goal cancels the sanction',
    'The card is still shown at the next stoppage after the goal celebration',
    'The card is only shown if it was a red card offence',
    'The referee decides after the match',
    'B'),
  (8, 'What signal does the referee use to indicate advantage?',
    'Blowing the whistle twice',
    'Raising both arms upward',
    'Sweeping one or both arms upward in the direction of play',
    'Pointing at the fouled player',
    'C')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'advantage-application'
on conflict (test_id, order_index) do nothing;

-- ============================================
-- 7. QUESTIONS — Cards & Discipline
-- ============================================

insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
from public.tests t
cross join (values
  (1, 'A player receives a second yellow card in the same match. What is the procedure?',
    'Show the second yellow card, then the red card, and send the player off',
    'Show only the red card',
    'Show only the second yellow card',
    'Verbal warning first, then red if repeated',
    'A'),
  (2, 'Which of the following is a sending-off offence?',
    'Persistent fouling',
    'Denying an obvious goal-scoring opportunity by handling the ball',
    'Dissent by word or action',
    'Delaying the restart',
    'B'),
  (3, 'A substitute uses offensive language from the bench. Can they be sanctioned?',
    'No, only players on the field can be carded',
    'Yes, they can be shown a yellow or red card',
    'Only a verbal warning',
    'The team manager receives the card instead',
    'B'),
  (4, 'A player removes their shirt while celebrating a goal. What is the sanction?',
    'No sanction — it is a normal celebration',
    'Verbal warning',
    'Caution (yellow card)',
    'Sending off (red card)',
    'C'),
  (5, 'Can a referee show a card to a player after the final whistle?',
    'No, disciplinary action ends with the match',
    'Yes, until the referee has left the field of play',
    'Only for violent conduct',
    'Only during the cooling-off period',
    'B'),
  (6, 'A player delays the restart of play by kicking the ball away after a foul is called. What is the minimum sanction?',
    'Verbal warning',
    'Indirect free kick',
    'Caution (yellow card)',
    'No sanction required',
    'C'),
  (7, 'A team official is sent off from the technical area. Where must they go?',
    'They can stay in the stands',
    'They must leave the vicinity of the field of play and technical area',
    'They can sit behind the bench',
    'They go to the dressing room only',
    'B'),
  (8, 'What does DOGSO stand for?',
    'Denial Of Goal Scoring Offence',
    'Denying an Obvious Goal-Scoring Opportunity',
    'Direct Offence in the Goal-Scoring Option',
    'Denial Of Game by Serious Offence',
    'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'cards-and-discipline'
on conflict (test_id, order_index) do nothing;

-- ============================================
-- 8. QUESTIONS — VAR Protocol
-- ============================================

insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
from public.tests t
cross join (values
  (1, 'Which of the following situations can VAR intervene on?',
    'All foul decisions',
    'Goals, penalty decisions, direct red cards, and mistaken identity',
    'Yellow cards and throw-ins',
    'Offside only',
    'B'),
  (2, 'What is the minimum requirement for VAR to overturn a decision?',
    'Any doubt about the decision',
    'A clear and obvious error',
    'Agreement from all VAR officials',
    'Request from a team captain',
    'B'),
  (3, 'Who makes the final decision when VAR is used?',
    'The VAR operator',
    'The fourth official',
    'The referee on the field',
    'A panel of video officials',
    'C'),
  (4, 'What signal does the referee make to indicate a VAR review?',
    'A circular hand motion',
    'Drawing a rectangle (TV screen shape) in the air',
    'Pointing to their ear',
    'Raising a flag',
    'B'),
  (5, 'Can VAR be used to review a yellow card decision?',
    'Yes, for all yellow cards',
    'No, VAR cannot review yellow cards',
    'Only for second yellow cards',
    'Only in the penalty area',
    'B'),
  (6, 'After the referee goes to the Review Area (OFR), what can they do?',
    'Only confirm their original decision',
    'Change the decision, confirm it, or add additional sanctions',
    'Only overturn the decision',
    'Ask the VAR to make the decision',
    'B'),
  (7, 'Can a goal be disallowed by VAR for a foul in the build-up?',
    'No, only offside can cancel a goal via VAR',
    'Yes, if there was an offence in the attacking phase leading to the goal',
    'Only for handball',
    'Only if the referee requests a review',
    'B'),
  (8, 'What does OFR stand for in VAR protocol?',
    'Official Field Review',
    'On-Field Review',
    'Official Footage Replay',
    'Onsite Final Review',
    'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'var-protocol'
on conflict (test_id, order_index) do nothing;

-- ============================================
-- 9. QUESTIONS — Free Kicks Basics
-- ============================================

insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
from public.tests t
cross join (values
  (1, 'Can a goal be scored directly from an indirect free kick?',
    'Yes, any free kick can result in a goal',
    'No, the ball must touch another player first',
    'Only if it is inside the penalty area',
    'Only if the goalkeeper touches it',
    'B'),
  (2, 'How far must opponents stand from the ball on a free kick?',
    'At least 5 metres',
    'At least 9.15 metres (10 yards)',
    'At least 11 metres',
    'At least 7 metres',
    'B'),
  (3, 'A free kick is taken inside the kickers own penalty area. When is the ball in play?',
    'When the ball is kicked and clearly moves',
    'When the ball leaves the penalty area',
    'When the referee blows the whistle',
    'When an opponent touches it',
    'A'),
  (4, 'The referee signals an indirect free kick. How is this indicated?',
    'By pointing in the direction of play',
    'By raising an arm above the head until the ball is touched by another player or goes out of play',
    'By blowing the whistle twice',
    'By waving both arms',
    'B'),
  (5, 'A player takes a quick free kick before opponents have retreated 9.15m. Is this allowed?',
    'No, the referee must always ensure the distance',
    'Yes, the kicker accepts the position of the opponents',
    'Only if the referee has blown the whistle',
    'Only in the attacking half',
    'B'),
  (6, 'A defending team forms a wall of 4 players. Can attacking players stand in the wall?',
    'Yes, they can stand wherever they want',
    'No, attacking players must be at least 1 metre from the wall of 3 or more defenders',
    'Only if the referee permits it',
    'Only one attacking player may join the wall',
    'B'),
  (7, 'What happens if a free kick is kicked directly into the teams own goal?',
    'Own goal is awarded',
    'Corner kick to the opposing team',
    'The kick is retaken',
    'Goal kick',
    'B'),
  (8, 'A player kicks the ball and then touches it again before anyone else. What is the decision?',
    'Play continues',
    'Indirect free kick to the opposing team',
    'Direct free kick to the opposing team',
    'The free kick is retaken',
    'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'free-kicks-basics'
on conflict (test_id, order_index) do nothing;

-- ============================================
-- 10. QUESTIONS — General Laws of the Game
-- ============================================

insert into public.test_questions (test_id, order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
select t.id, q.order_index, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option
from public.tests t
cross join (values
  (1, 'How many players must a team have to start a match?',
    'At least 9',
    'At least 7',
    'Exactly 11',
    'At least 8',
    'B'),
  (2, 'How long is each half of a standard match?',
    '40 minutes',
    '45 minutes',
    '50 minutes',
    '35 minutes',
    'B'),
  (3, 'What is the circumference of a regulation football?',
    '55-60 cm',
    '68-70 cm',
    '72-75 cm',
    '60-65 cm',
    'B'),
  (4, 'A drop ball is awarded. Who can participate?',
    'Any player from both teams',
    'Only the player who last touched the ball',
    'One player from the team that last touched the ball (or goalkeeper if in penalty area)',
    'Only goalkeepers',
    'C'),
  (5, 'When is the ball out of play?',
    'When any part of the ball is on the line',
    'When the whole of the ball crosses the whole of the line',
    'When the referee blows the whistle',
    'Both B and C',
    'D'),
  (6, 'How many substitutions are allowed in a standard competitive match under IFAB rules?',
    '3 substitutions',
    '5 substitutions',
    'Unlimited',
    '4 substitutions',
    'B'),
  (7, 'What is the maximum number of people allowed in the technical area?',
    'No specific limit in the Laws',
    'The competition rules determine this',
    'Maximum 10 people',
    'Maximum 6 people',
    'B'),
  (8, 'The ball strikes the referee and goes into the goal. What is the decision?',
    'Goal stands',
    'Drop ball from where the referee was struck',
    'Goal kick',
    'Corner kick',
    'B')
) as q(order_index, question_text, option_a, option_b, option_c, option_d, correct_option)
where t.slug = 'general-laws'
on conflict (test_id, order_index) do nothing;

-- ============================================
-- 11. VIDEO SCENARIOS
-- ============================================

insert into public.video_scenarios (title, description, video_url, topic, correct_decision, is_active) values
  ('Penalty Area Challenge',
   'A defender slides in from behind as the attacker enters the penalty area. Analyse the contact and timing.',
   'https://example.com/videos/penalty-area-challenge.mp4',
   'Penalties',
   'Penalty kick and yellow card',
   true),
  ('Offside Run on Through Ball',
   'An attacker makes a run behind the defensive line. Determine if the player was in an offside position when the ball was played.',
   'https://example.com/videos/offside-run.mp4',
   'Offside',
   'Offside — attacker beyond second-last defender',
   true),
  ('Handball in the Wall',
   'During a free kick, the ball strikes a defender''s arm in the wall. Assess whether the arm position is natural.',
   'https://example.com/videos/handball-wall.mp4',
   'Handball',
   'No handball — arm in natural position',
   true),
  ('Last Man Foul',
   'A defender pulls back an attacker who is through on goal with no other defenders. Determine the sanction.',
   'https://example.com/videos/last-man-foul.mp4',
   'Cards',
   'Direct free kick and red card (DOGSO)',
   true),
  ('Advantage Leading to Goal',
   'A midfielder is fouled but keeps the ball and assists a teammate who scores. Should the referee allow the goal?',
   'https://example.com/videos/advantage-goal.mp4',
   'Advantage',
   'Goal stands — advantage played successfully',
   true),
  ('VAR Intervention — Offside Goal',
   'A goal is scored but the assistant referee flags for offside. VAR checks the replay. Make the call.',
   'https://example.com/videos/var-offside-goal.mp4',
   'VAR',
   'Goal disallowed — offside confirmed by VAR',
   true)
on conflict do nothing;
