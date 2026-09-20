import Head from "next/head";
import { PRODUCT } from "../lib/product";
import Layout from "../components/Layout";
import FeedbackForm from "../components/FeedbackForm";

export default function FeedbackPage() {
  return (
    <Layout>
      <Head>
        <title>Feedback · {PRODUCT.name}</title>
        <meta name="description" content={`Submit feedback, suggestions, or issues to ${PRODUCT.name}`} />
      </Head>
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Submit feedback</h1>
        <p className="mt-2 text-slate-600">Your feedback goes straight to our team and helps us improve {PRODUCT.name}.</p>
        <div className="mt-6">
          <FeedbackForm />
        </div>
      </div>
    </Layout>
  );
}
