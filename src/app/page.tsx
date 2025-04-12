import { type Metadata } from "next"
import { redirect } from 'next/navigation'
import { defaultLocale } from "@/config/site-config"

export const metadata: Metadata = {
  title: 'Redirecting...',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout() {
  redirect(`/${defaultLocale}`)
}
