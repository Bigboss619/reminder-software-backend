import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API);

export const sendEmail = async ({ to, subject, html }) => {
    try {
        await resend.emails.send({
            from: "Fleet System <onboarding@resend.dev>",
            to: Array.isArray(to) ? to : [to],
            subject,
            html
        });
        console.log("Email sent to: ", to);
    } catch (error) {
        console.error("Email error:", error.message);
    }
};
