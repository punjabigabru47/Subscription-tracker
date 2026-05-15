import dayjs from "dayjs";
import transporter, { accountEmail } from "../config/nodemailer.js";
import { emailTemplates } from "./email-template.js";
export const sendEmailReminder = async ({ to, type, subscription }) => {
  if (!to || !type) throw new Error("Missing required fields");

  const template = emailTemplates.find((t) => t.type === type);
  if (!template) throw new Error("Invalid email template");

  const mailInfo = {
    userName: subscription.user.name,
    subscriptionName: subscription.name,
    renewalDate: dayjs(subscription.renewalDate).format("DD MMM YYYY"),
    planName: subscription.name,
    price: `${subscription.currency} ${subscription.price} (${subscription.frequency})`,
    paymentMethod: subscription.paymentMethod,
  };

  const message = template.generateBody(mailInfo);
  const subject = template.generateSubject(mailInfo);

  const mailOptions = {
    from: accountEmail,
    to: to,
    subject: subject,
    html: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error("Error sending email:", error);
    else console.log("Email sent:", info.response);
  });
};
