import { proxyActivities } from "@temporalio/workflow";

const activities = proxyActivities({
  startToCloseTimeout: "1 minute",
});

export async function timestampThroughActivity(input) {
  return await activities.bumpTimestamp(input);
}

export async function echoBytes(input) {
  return input;
}
