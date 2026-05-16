import { NODE_ENV, SERVER_URL } from "../config/env.js";
import workflowClient from "../config/upstash.js";
import pool from "../models/subscription.model.js";
import {
  createHttpError,
  createSubscriptionSchema,
  parseRequest,
  updateSubscriptionSchema,
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

const getSubscriptionId = (id) => {
  const subscriptionId = Number(id);

  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
    throw createHttpError("Invalid subscription id", 400);
  }

  return subscriptionId;
};

const getOwnedSubscription = async (subscriptionId, userId) => {
  const { rows } = await pool.query(
    "SELECT * FROM subscriptions WHERE id = $1 AND user_id = $2",
    [subscriptionId, userId],
  );

  if (rows.length === 0) {
    throw createHttpError("Subscription not found", 404);
  }

  return rows[0];
};

const hasField = (object, field) =>
  Object.prototype.hasOwnProperty.call(object, field);

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

export const getSubscriptions = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id],
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

export const getSubscription = async (req, res, next) => {
  try {
    const subscriptionId = getSubscriptionId(req.params.id);
    const subscription = await getOwnedSubscription(subscriptionId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Subscription fetched successfully",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubscription = async (req, res, next) => {
  try {
    const subscriptionId = getSubscriptionId(req.params.id);
    const currentSubscription = await getOwnedSubscription(
      subscriptionId,
      req.user.id,
    );
    const updates = parseRequest(updateSubscriptionSchema, req.body);

    const startDate = updates.startDate ?? currentSubscription.start_date;
    const frequency = updates.frequency ?? currentSubscription.frequency;
    const renewalDate =
      updates.renewalDate ??
      (updates.startDate || updates.frequency
        ? calculateRenewalDate(startDate, frequency)
        : currentSubscription.renewal_date);
    const status =
      updates.status ??
      (updates.renewalDate || updates.startDate || updates.frequency
        ? getStatus(renewalDate)
        : currentSubscription.status);

    const { rows } = await pool.query(
      `UPDATE subscriptions
       SET name = $1,
           price = $2,
           currency = $3,
           frequency = $4,
           category = $5,
           payment_method = $6,
           status = $7,
           start_date = $8,
           renewal_date = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [
        updates.name ?? currentSubscription.name,
        updates.price ?? currentSubscription.price,
        updates.currency ?? currentSubscription.currency,
        frequency,
        hasField(updates, "category")
          ? updates.category
          : currentSubscription.category,
        hasField(updates, "paymentMethod")
          ? updates.paymentMethod
          : currentSubscription.payment_method,
        status,
        startDate,
        renewalDate,
        subscriptionId,
        req.user.id,
      ],
    );

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubscription = async (req, res, next) => {
  try {
    const subscriptionId = getSubscriptionId(req.params.id);
    const { rows } = await pool.query(
      `DELETE FROM subscriptions
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [subscriptionId, req.user.id],
    );

    if (rows.length === 0) {
      throw createHttpError("Subscription not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const subscriptionId = getSubscriptionId(req.params.id);
    const { rows } = await pool.query(
      `UPDATE subscriptions
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      ["cancelled", subscriptionId, req.user.id],
    );

    if (rows.length === 0) {
      throw createHttpError("Subscription not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Subscription cancelled successfully",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
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
