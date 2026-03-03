import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API);

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const recipients = Array.isArray(to) ? to : [to];
        
        const result = await resend.emails.send({
            from: "Fleet System <onboarding@resend.dev>",
            to: recipients,
            subject,
            html
        });
        
        console.log("Email sent to: ", recipients);
        console.log("Resend Response:", result);
        
        // Check if email was successfully queued
        if (result.data && result.data.id) {
            console.log(`Email queued with ID: ${result.data.id}`);
        }
        
        return result;
    } catch (error) {
        console.error("Email error:", error.message);
        console.error("Full error:", error);
        throw error;
    }
};
