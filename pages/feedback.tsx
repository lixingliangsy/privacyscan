import Head from "next/head";
import Layout from "../components/Layout";
import FeedbackForm from "../components/FeedbackForm";
import { useT } from "../lib/i18n/provider";

export default function FeedbackPage() {
  const { t } = useT();
  return (
    <Layout>
      <Head>
        <title>{t("feedback.open")} · PrivScan</title>
        <meta name="description" content={t("feedback.blurb")} />
      </Head>

      <div className="bg-blue-600 py-10">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h1 className="text-3xl font-bold text-white">{t("feedback.open")}</h1>
          <p className="mt-2 text-blue-100">{t("feedback.blurb")}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <FeedbackForm />
      </div>
    </Layout>
  );
}
