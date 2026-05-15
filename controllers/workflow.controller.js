import dayjs from "dayjs";
import { createRequire } from "module";
import pool from "../models/subscription.model.js";

const require = createRequire(import.meta.url);
const { serve } = require("@upstash/workflow/express");

const REMINDERS = [7, 5, 2, 1]; // days before renewal

export const sendReminders = serve(async (context) => {
  const { subscriptionId } = context.requestPayload ?? {};

  console.log(`Workflow started: ${context.workflowRunId}`);

  if (!subscriptionId) {
    console.log("Workflow stopped: subscriptionId is missing");
    return;
  }

  const subscription = await fetchSubscription(context, subscriptionId);

  if (!subscription) {
    console.log(`Workflow stopped: subscription ${subscriptionId} not found`);
    return;
  }

  if (subscription.status !== "active") {
    console.log(
      `Workflow stopped: subscription ${subscriptionId} is ${subscription.status}`,
    );
    return;
  }

  const renewalDate = dayjs(subscription.renewal_date);

  if (renewalDate.isBefore(dayjs())) {
    console.log(
      `Renewal date has passed for subscription ${subscriptionId}. stopping workflow`,
    );
    return;
  }

  for (const daysBefore of REMINDERS) {
    const reminderDate = renewalDate.subtract(daysBefore, "days");
    const label = `reminder ${daysBefore} days before`;

    if (reminderDate.isAfter(dayjs())) {
      await sleepUntilReminder(context, label, reminderDate);
    } else {
      console.log(`Skipping sleep for ${label}; reminder date already passed`);
    }

    await triggerReminder(context, label);
  }
});

const fetchSubscription = async (context, subscriptionId) => {
  return await context.run("get subscription", async () => {
    const { rows } = await pool.query(
      `SELECT subscriptions.*, users.name AS user_name, users.email AS user_email
       FROM subscriptions
       JOIN users ON users.id = subscriptions.user_id
       WHERE subscriptions.id = $1`,
      [subscriptionId],
    );

    return rows[0];
  });
};

// sleep function
const sleepUntilReminder = async (context, label, date) => {
  console.log(`Sleeping until ${label} reminder at ${date}`);
  await context.sleepUntil(label, date.toDate());
};

// trigger reminder function
const triggerReminder = async (context, label) => {
  await context.run(label, () => {
    console.log(`Triggering ${label} reminder`);
    // send email to user, message, push notification, etc.
  });
};
