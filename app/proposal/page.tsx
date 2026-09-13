import { ProposalPage } from "@/views/info/ProposalPage";
import { pageSeo, JsonLd } from "@/lib/seo-page";
import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = object;

export async function generateMetadata(_unused: Props) {
  // redirect_to is NOT handled here: redirect from generateMetadata
  // is unsupported in Next 16 (crashes Server Components render).
  const { metadata } = await pageSeo(`/proposal`);
  return metadata;
}

export default async function Page(_unused: Props) {
  const { jsonld, redirectTo } = await pageSeo(`/proposal`);
  // Legacy 301 (P0.2/P0.4): slug renames etc - from the page body.
  if (redirectTo) permanentRedirect(redirectTo);
  return (
    <>
      <JsonLd blocks={jsonld} />
      <ProposalPage />
    </>
  );
}
