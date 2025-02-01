import { type Metadata } from "next"
import { redirect } from 'next/navigation'
import { defaultLocale } from "@/config/site-config"

export const metadata: Metadata = {
  title: 'Redirecting...',
}

export default function RootLayout() {
  redirect(`/${defaultLocale}`)
}
