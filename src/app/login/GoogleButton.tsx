"use client"

import { useEffect } from "react"
import { signIn } from "next-auth/react"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void
          renderButton: (element: HTMLElement, config: object) => void
        }
      }
    }
  }
}

export function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          await signIn("credentials", {
            credential: response.credential,
            redirectTo: callbackUrl,
          })
        },
      })

      const btn = document.getElementById("google-signin-btn")
      if (btn) {
        window.google?.accounts.id.renderButton(btn, {
          type: "standard",
          text: "continue_with",
          theme: "outline",
          size: "large",
          width: "320",
          logo_alignment: "left",
        })
      }
    }

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [callbackUrl])

  return <div id="google-signin-btn" className="flex justify-center min-h-[44px]" />
}
