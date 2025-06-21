#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { execa } from "execa";

// dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);

interface Block {
  startTime?: string;
  actualEndTime?: string;
  totalTokens?: number;
  isActive?: boolean;
  isGap?: boolean;
}

interface CcusageData {
  blocks: Block[];
}

type PlanType = "pro" | "max5" | "max20" | "custom_max";

async function runCcusage(): Promise<CcusageData | null> {
  try {
    const result = await execa("npx", ["ccusage", "blocks", "--json"]);
    return JSON.parse(result.stdout);
  } catch (error) {
    console.error("Error running ccusage:", error);
    return null;
  }
}

function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.floor(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

function createTokenProgressBar(
  percentage: number,
  width: number = 50
): string {
  const filled = Math.floor((width * percentage) / 100);

  const greenBar = "█".repeat(filled);
  const redBar = "░".repeat(width - filled);

  return `🟢 [${chalk.green(greenBar)}${chalk.red(
    redBar
  )}] ${percentage.toFixed(1)}%`;
}

function createTimeProgressBar(
  elapsedMinutes: number,
  totalMinutes: number,
  width: number = 50
): string {
  const percentage =
    totalMinutes <= 0
      ? 0
      : Math.min(100, (elapsedMinutes / totalMinutes) * 100);
  const filled = Math.floor((width * percentage) / 100);

  const blueBar = "█".repeat(filled);
  const redBar = "░".repeat(width - filled);

  const remainingTime = formatTime(Math.max(0, totalMinutes - elapsedMinutes));
  return `⏰ [${chalk.blue(blueBar)}${chalk.red(redBar)}] ${remainingTime}`;
}

function printHeader(): void {
  const sparkles = `${chalk.cyan("✦ ✧ ✦ ✧")}`;

  console.log(`${sparkles} ${chalk.cyan("CLAUDE TOKEN MONITOR")} ${sparkles}`);
  console.log(chalk.blue("=".repeat(60)));
  console.log();
}

// function getVelocityIndicator(burnRate: number): string {
//   if (burnRate < 50) return '🐌';
//   if (burnRate < 150) return '➡️';
//   if (burnRate < 300) return '🚀';
//   return '⚡';
// }

function calculateHourlyBurnRate(
  blocks: Block[],
  currentTime: dayjs.Dayjs
): number {
  if (!blocks.length) return 0;

  const oneHourAgo = currentTime.subtract(1, "hour");
  let totalTokens = 0;

  for (const block of blocks) {
    if (!block.startTime || block.isGap) continue;

    const startTime = dayjs(block.startTime);

    // Determine session end time
    let sessionActualEnd: dayjs.Dayjs;
    if (block.isActive) {
      sessionActualEnd = currentTime;
    } else if (block.actualEndTime) {
      sessionActualEnd = dayjs(block.actualEndTime);
    } else {
      sessionActualEnd = currentTime;
    }

    // Check if session overlaps with the last hour
    if (sessionActualEnd.isBefore(oneHourAgo)) continue;

    // Calculate how much of this session falls within the last hour
    const sessionStartInHour = startTime.isAfter(oneHourAgo)
      ? startTime
      : oneHourAgo;
    const sessionEndInHour = sessionActualEnd.isBefore(currentTime)
      ? sessionActualEnd
      : currentTime;

    if (
      sessionEndInHour.isBefore(sessionStartInHour) ||
      sessionEndInHour.isSame(sessionStartInHour)
    ) {
      continue;
    }

    // Calculate portion of tokens used in the last hour
    const totalSessionDuration = sessionActualEnd.diff(startTime, "minute");
    const hourDuration = sessionEndInHour.diff(sessionStartInHour, "minute");

    if (totalSessionDuration > 0) {
      const sessionTokens = block.totalTokens || 0;
      const tokensInHour =
        sessionTokens * (hourDuration / totalSessionDuration);
      totalTokens += tokensInHour;
    }
  }

  // Return tokens per minute
  return totalTokens > 0 ? totalTokens / 60 : 0;
}

function getNextResetTime(
  currentTime: dayjs.Dayjs,
  customResetHour?: number,
  timezoneStr: string = "Europe/Warsaw"
): dayjs.Dayjs {
  const targetTime = currentTime.tz(timezoneStr);

  const resetHours =
    customResetHour !== undefined ? [customResetHour] : [4, 9, 14, 18, 23];

  const currentHour = targetTime.hour();
  const currentMinute = targetTime.minute();

  // Find next reset hour
  let nextResetHour: number | null = null;
  for (const hour of resetHours) {
    if (currentHour < hour || (currentHour === hour && currentMinute === 0)) {
      nextResetHour = hour;
      break;
    }
  }

  // If no reset hour found today, use first one tomorrow
  if (nextResetHour === null) {
    nextResetHour = resetHours[0];
    return targetTime
      .add(1, "day")
      .hour(nextResetHour)
      .minute(0)
      .second(0)
      .millisecond(0);
  } else {
    return targetTime.hour(nextResetHour).minute(0).second(0).millisecond(0);
  }
}

function getTokenLimit(plan: PlanType, blocks?: Block[]): number {
  if (plan === "custom_max" && blocks) {
    let maxTokens = 0;
    for (const block of blocks) {
      if (!block.isGap && !block.isActive) {
        const tokens = block.totalTokens || 0;
        if (tokens > maxTokens) {
          maxTokens = tokens;
        }
      }
    }
    return maxTokens > 0 ? maxTokens : 7000;
  }

  const limits: Record<PlanType, number> = {
    pro: 7000,
    max5: 35000,
    max20: 140000,
    custom_max: 7000,
  };

  return limits[plan];
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("aim")
    .description("Claude Token Monitor - Real-time token usage monitoring")
    .option("--plan <type>", "Claude plan type", "pro")
    .option(
      "--reset-hour <hour>",
      "Change the reset hour (0-23) for daily limits",
      parseInt
    )
    .option("--timezone <tz>", "Timezone for reset times", "Europe/Warsaw")
    .parse();

  const options = program.opts();
  const plan = options.plan as PlanType;
  const resetHour = options.resetHour;
  const timezoneStr = options.timezone;

  // For custom_max plan, get initial data to determine limit
  let tokenLimit: number;
  if (plan === "custom_max") {
    const initialData = await runCcusage();
    tokenLimit = getTokenLimit(plan, initialData?.blocks);
  } else {
    tokenLimit = getTokenLimit(plan);
  }

  try {
    // Clear screen and hide cursor
    process.stdout.write("\x1b[2J\x1b[H\x1b[?25l");

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Move cursor to top
      process.stdout.write("\x1b[H");

      const data = await runCcusage();
      if (!data?.blocks) {
        console.log("Failed to get usage data");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }

      // Find active block
      const activeBlock = data.blocks.find((block) => block.isActive);
      if (!activeBlock) {
        console.log("No active session found");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }

      // Extract data from active block
      const tokensUsed = activeBlock.totalTokens || 0;

      // Check if tokens exceed limit and switch to custom_max if needed
      if (tokensUsed > tokenLimit && plan === "pro") {
        const newLimit = getTokenLimit("custom_max", data.blocks);
        if (newLimit > tokenLimit) {
          tokenLimit = newLimit;
        }
      }

      const usagePercentage =
        tokenLimit > 0 ? (tokensUsed / tokenLimit) * 100 : 0;
      const tokensLeft = tokenLimit - tokensUsed;

      // Time calculations
      // let elapsedMinutes = 0;
      let currentTime = dayjs();
      if (activeBlock.startTime) {
        currentTime = dayjs();
        // elapsedMinutes = currentTime.diff(startTime, 'minute');
      }

      // const sessionDuration = 300; // 5 hours in minutes
      // const remainingMinutes = Math.max(0, sessionDuration - elapsedMinutes);

      // Calculate burn rate from ALL sessions in the last hour
      const burnRate = calculateHourlyBurnRate(data.blocks, currentTime);

      // Reset time calculation
      const resetTime = getNextResetTime(currentTime, resetHour, timezoneStr);
      const minutesToReset = resetTime.diff(currentTime, "minute");

      // Predicted end calculation
      let predictedEndTime: dayjs.Dayjs;
      if (burnRate > 0 && tokensLeft > 0) {
        const minutesToDepletion = tokensLeft / burnRate;
        predictedEndTime = currentTime.add(minutesToDepletion, "minute");
      } else {
        predictedEndTime = resetTime;
      }

      // Display header
      printHeader();

      // Token Usage section
      console.log(
        `📊 ${chalk.white("Token Usage:")}    ${createTokenProgressBar(
          usagePercentage
        )}`
      );
      console.log();

      // Time to Reset section
      const timeSinceReset = Math.max(0, 300 - minutesToReset);
      console.log(
        `⏳ ${chalk.white("Time to Reset:")}  ${createTimeProgressBar(
          timeSinceReset,
          300
        )}`
      );
      console.log();

      // Detailed stats
      console.log(
        `🎯 ${chalk.white("Tokens:")}         ${chalk.white(
          tokensUsed.toLocaleString()
        )} / ${chalk.gray(`~${tokenLimit.toLocaleString()}`)} (${chalk.cyan(
          `${tokensLeft.toLocaleString()} left`
        )})`
      );
      console.log(
        `🔥 ${chalk.white("Burn Rate:")}      ${chalk.yellow(
          burnRate.toFixed(1)
        )} ${chalk.gray("tokens/min")}`
      );
      console.log();

      // Predictions
      const predictedEndLocal = predictedEndTime.tz(timezoneStr);
      const resetTimeLocal = resetTime.tz(timezoneStr);

      const predictedEndStr = predictedEndLocal.format("HH:mm");
      const resetTimeStr = resetTimeLocal.format("HH:mm");
      console.log(`🏁 ${chalk.white("Predicted End:")} ${predictedEndStr}`);
      console.log(`🔄 ${chalk.white("Token Reset:")}   ${resetTimeStr}`);
      console.log();

      // Show notifications
      const showSwitchNotification =
        tokensUsed > 7000 && plan === "pro" && tokenLimit > 7000;
      const showExceedNotification = tokensUsed > tokenLimit;

      if (showSwitchNotification) {
        console.log(
          `🔄 ${chalk.yellow(
            `Tokens exceeded Pro limit - switched to custom_max (${tokenLimit.toLocaleString()})`
          )}`
        );
        console.log();
      }

      if (showExceedNotification) {
        console.log(
          `🚨 ${chalk.red(
            `TOKENS EXCEEDED MAX LIMIT! (${tokensUsed.toLocaleString()} > ${tokenLimit.toLocaleString()})`
          )}`
        );
        console.log();
      }

      // Warning if tokens will run out before reset
      if (predictedEndTime.isBefore(resetTime)) {
        console.log(`⚠️  ${chalk.red("Tokens will run out BEFORE reset!")}`);
        console.log();
      }

      // Status line
      const currentTimeStr = dayjs().format("HH:mm:ss");
      console.log(
        `⏰ ${chalk.gray(currentTimeStr)} 📝 ${chalk.cyan(
          "Smooth sailing..."
        )} | ${chalk.gray("Ctrl+C to exit")} 🟨`
      );

      // Clear any remaining lines
      process.stdout.write("\x1b[J");

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Show cursor before exiting
      process.stdout.write("\x1b[?25h");
      console.log(`\n\n${chalk.cyan("Monitoring stopped.")}`);
      // Clear terminal
      process.stdout.write("\x1b[2J\x1b[H");
      process.exit(0);
    } else {
      // Show cursor on any error
      process.stdout.write("\x1b[?25h");
      throw error;
    }
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  process.stdout.write("\x1b[?25h"); // Show cursor
  console.log(`\n\n${chalk.cyan("Monitoring stopped.")}`);
  process.stdout.write("\x1b[2J\x1b[H"); // Clear terminal
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stdout.write("\x1b[?25h"); // Show cursor on error
    console.error("Error:", error);
    process.exit(1);
  });
}
