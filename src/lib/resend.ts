import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY as string;

if (!RESEND_API_KEY) {
  throw new Error("Please provide RESEND_API_KEY in the environment variables");
}

const resend = new Resend(RESEND_API_KEY);

export default resend;
