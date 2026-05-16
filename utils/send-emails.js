import dayjs from "dayjs";
import transporter, { accountEmail } from "../config/nodemailer.js";
import { emailTemplates } from "./email-template.js";

export const sendEmailReminder = async ({ to, type, subscription }) => {
  if (!to || !type || !subscription) {
    throw new Error("Missing required fields");
  }

  const template = emailTemplates.find((t) => t.label === type);
  if (!template) throw new Error("Invalid email template");

  const mailInfo = {
    userName: subscription.user_name,
    subscriptionName: subscription.name,
    renewalDate: dayjs(subscription.renewal_date).format("DD MMM YYYY"),
    planName: subscription.name,
    price: `${subscription.currency} ${subscription.price} (${subscription.frequency})`,
    paymentMethod: subscription.payment_method,
    accountSettingsLink: "#",
    supportLink: "#",
  };

  const message = template.generateBody(mailInfo);
  const subject = template.generateSubject(mailInfo);

  const mailOptions = {
    from: accountEmail,
    to: to,
    subject: subject,
    html: message,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw error;
  }
};
