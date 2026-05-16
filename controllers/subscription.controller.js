import { NODE_ENV, SERVER_URL } from "../config/env.js";
import workflowClient from "../config/upstash.js";
import pool from "../models/subscription.model.js";
import {
  createHttpError,
  createSubscriptionSchema,
  parseRequest,
} from "../utils/validation.js";

const calculateRenewalDate = (startDate, frequency) => {
  const renewalDate = new Date(startDate);

  if (Number.isNaN(renewalDate.getTime())) {
    throw createHttpError("Start date must be a valid date", 400);
  }

  switch (frequency?.toLowerCase()) {
    case "daily":
      renewalDate.setUTCDate(renewalDate.getUTCDate() + 1);
      break;
    case "weekly":
      renewalDate.setUTCDate(renewalDate.getUTCDate() + 7);
      break;
    case "monthly":
      renewalDate.setUTCMonth(renewalDate.getUTCMonth() + 1);
      break;
    case "yearly":
    case "annual":
    case "annually":
      renewalDate.setUTCFullYear(renewalDate.getUTCFullYear() + 1);
      break;
    default:
      throw createHttpError(
        "Frequency must be daily, weekly, monthly, or yearly",
        400,
      );
  }

  return renewalDate.toISOString().slice(0, 10);
};

const getStatus = (renewalDate, customStatus) => {
  if (customStatus) {
    return customStatus;
  }

  const renewal = new Date(renewalDate);
  const today = new Date();

  renewal.setUTCHours(0, 0, 0, 0);
  today.setUTCHours(0, 0, 0, 0);

  return renewal < today ? "expired" : "active";
};

// createSubscription
export const createSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw createHttpError("Authenticated user is required", 401);
    }

    const {
      name,
      price,
      currency,
      frequency,
      category,
      paymentMethod,
      status,
      startDate,
      renewalDate,
    } = parseRequest(createSubscriptionSchema, req.body);

    const finalRenewalDate =
      renewalDate ?? calculateRenewalDate(startDate, frequency);

    const subscriptionData = {
      name,
      price,
      currency,
      frequency,
      category,
      paymentMethod: paymentMethod ?? null,
      status: getStatus(finalRenewalDate, status),
      startDate,
      renewalDate: finalRenewalDate,
      userId,
    };

    const { rows } = await pool.query(
      `INSERT INTO subscriptions (
        name,
        price,
        currency,
        frequency,
        category,
        payment_method,
        status,
        start_date,
        renewal_date,
        user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        subscriptionData.name,
        subscriptionData.price,
        subscriptionData.currency,
        subscriptionData.frequency,
        subscriptionData.category,
        subscriptionData.paymentMethod,
        subscriptionData.status,
        subscriptionData.startDate,
        subscriptionData.renewalDate,
        subscriptionData.userId,
      ],
    );

    const subscription = rows[0];
    const { workflowRunId } = await triggerSubscriptionWorkflow(subscription.id);

    console.log(`Workflow triggered: ${workflowRunId}`);

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: {
        ...subscription,
        workflowRunId,
      },
    });
  } catch (error) {
    next(error);
  }
};

const triggerSubscriptionWorkflow = async (subscriptionId) => {
  if (NODE_ENV === "test") {
    return { workflowRunId: "test-workflow-run" };
  }

  return await workflowClient.trigger({
    url: new URL(
      "/api/v1/workflow/subscription/reminder",
      SERVER_URL,
    ).toString(),
    body: {
      subscriptionId,
    },
  });
};

// getUserSubscriptions
export const getUserSubscriptions = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw createHttpError("Invalid user id", 400);
    }

    if (req.user.id !== userId) {
      throw createHttpError("Unauthorized", 401);
    }

    const { rows } = await pool.query(
      `SELECT *
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    res.status(200).json({
      success: true,
      message: "Subscriptions fetched successfully",
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};
