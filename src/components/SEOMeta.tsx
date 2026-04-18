import { Helmet } from "react-helmet-async";

interface SEOMetaProps {
  title: string;
  description?: string;
  keywords?: string;
  type?: string;
}

export function SEOMeta({
  title,
  description = "Official IIIT Nagpur VMS. Experience a seamless and secure visitor management process.",
  keywords = "IIITN, VMS, IIIT Nagpur VMS, secure access, campus administration, smart campus",
  type = "website",
}: SEOMetaProps) {
  const fullTitle = `${title} | IIIT Nagpur VMS`;
  const defaultImage = "/pwa-512x512.png"; // PWA icon or specific OG image

  // Avoid accessing window for SSR stability, although purely client-side here
  const url = typeof window !== "undefined" ? window.location.href : "";

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph tags for rich links on Social Media / Chat apps */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={defaultImage} />
      <meta property="og:site_name" content="IIIT Nagpur VMS" />

      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={defaultImage} />
    </Helmet>
  );
}
