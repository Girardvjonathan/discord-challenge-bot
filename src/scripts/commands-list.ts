import { pushupData, situpData, pullupData } from '../bot/commands/exercises';
import { data as submitChallengeActivityCommand } from '../bot/commands/submit_challenge_activity';
import { data as resultsCommand } from '../bot/commands/challenge_daily_result';
import { data as startChallengeCommand } from '../bot/commands/start_challenge';
import { data as openStatsCommand } from '../bot/commands/open_my_challenge_stats';
import { data as enableNotificationCommand } from '../bot/commands/enable_challenge_notification';

export const commands = [
  pushupData.toJSON(),
  situpData.toJSON(),
  pullupData.toJSON(),
  submitChallengeActivityCommand.toJSON(),
  resultsCommand.toJSON(),
  startChallengeCommand.toJSON(),
  openStatsCommand.toJSON(),
  enableNotificationCommand.toJSON(),
];
