import Link from "next/link";
import { Leaf, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Afritide Group</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              Africa&apos;s leading digital agricultural marketplace connecting verified farmers, exporters, and buyers worldwide.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-green-500" /><span>afritidegroup@gmail.com</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-green-500" /><span>+2348023148419</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-green-500" /><span>Lagos, Nigeria</span></div>
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="text-white font-semibold mb-4">Marketplace</h3>
            <ul className="space-y-2 text-sm">
              {["Livestock", "Cash Crops", "Dairy Products", "Fruits & Vegetables", "Fishery", "Machinery"].map((item) => (
                <li key={item}><Link href="/marketplace" className="hover:text-green-400 transition-colors">{item}</Link></li>
              ))}
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="text-white font-semibold mb-4">For Sellers</h3>
            <ul className="space-y-2 text-sm">
              {["Register as Farmer", "Become an Exporter", "List Products", "Seller Dashboard", "Verification", "Pricing"].map((item) => (
                <li key={item}><Link href="/register" className="hover:text-green-400 transition-colors">{item}</Link></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "About Us", href: "/" },
                { label: "How It Works", href: "/" },
                { label: "Price Board", href: "/" },
                { label: "Blog", href: "/" },
                { label: "Contact Us", href: "/" },
                { label: "Contact Support", href: "/support" },
                { label: "Privacy Policy", href: "/" },
                { label: "Terms of Service", href: "/" },
              ].map((item) => (
                <li key={item.label}><Link href={item.href} className="hover:text-green-400 transition-colors">{item.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 Afritide Agriculture Marketplace. All rights reserved.</p>
          <p>Built with ❤️ for African farmers by <span className="text-green-500">SuperILM Technologies</span></p>
        </div>
      </div>
    </footer>
  );
}