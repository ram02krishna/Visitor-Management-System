import { Helmet } from "react-helmet-async";

interface SEOMetaProps {
  title: string;
  description?: string;
  keywords?: string;
  type?: string;
}

export function SEOMeta({
  title,
  description = "IIIT Nagpur VMS — Smart Visitor & Campus Security System",
  keywords = "IIITN, VMS, IIIT Nagpur VMS, secure access, campus administration, smart campus",
  type = "website",
}: SEOMetaProps) {
  const fullTitle = `${title} | IIIT Nagpur VMS`;
  const defaultImage = "/pwa-512x512.png"; 
  const url = typeof window !== "undefined" ? window.location.href : "";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={defaultImage} />
      <meta property="og:site_name" content="IIIT Nagpur VMS" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={defaultImage} />
    </Helmet>
  );
}
