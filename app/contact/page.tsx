import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white">Contact</h1>
      <p className="mt-2 text-gray-300">
        Une question sur une carte, une commande, une demande specifique ou
        une recherche de carte commune ? Remplis ce formulaire, on te repond
        sous 48h.
      </p>

      <div className="mt-6 rounded-lg border border-white/10 bg-zinc-900/70 backdrop-blur-sm p-4 text-gray-200">
        <div className="text-xs uppercase text-gray-400">Email direct</div>
        <a href="mailto:Del6.2pokemon@gmail.com" className="text-brand-500 hover:underline">
          Del6.2pokemon@gmail.com
        </a>
      </div>

      <div className="mt-6">
        <ContactForm />
      </div>
    </div>
  );
}
