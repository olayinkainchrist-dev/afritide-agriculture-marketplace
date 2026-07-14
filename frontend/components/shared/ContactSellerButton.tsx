"use client";
import { useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { MessageSquare, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  sellerId: string;
  sellerName: string;
  productId?: string;
  className?: string;
  label?: string;
}

export default function ContactSellerButton({
  sellerId,
  sellerName,
  productId,
  className,
  label = "Contact Seller",
}: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const getDashboardMessages = () => {
    if (!user) return "/login";
    if (user.role === "BUYER") return "/dashboard/buyer/messages";
    return "/dashboard/farmer/messages";
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please write a message");
      return;
    }
    setSending(true);
    try {
      await apiClient.post("/messages", {
        receiver_id: sellerId,
        content: message.trim(),
        ...(productId ? { product_id: productId } : {}),
      });
      toast.success("Message sent!");
      setShowModal(false);
      setMessage("");
      router.push(getDashboardMessages());
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleClick = () => {
    if (!isAuthenticated) {
      toast.error("Please login to contact this seller");
      router.push("/login");
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={
          className ??
          "w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        }
      >
        <MessageSquare className="w-4 h-4" /> {label}
      </button>

      {/* Message modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-[#0a1a0f] border border-white/[0.08] rounded-3xl p-6 w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold">Contact {sellerName}</h3>
                <p className="text-gray-500 text-xs mt-0.5">Send an introduction message</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Suggested openers */}
            <div className="mb-4">
              <p className="text-gray-600 text-xs mb-2">Quick starters:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Hi, I'm interested in your products.",
                  "Can you share your product catalogue?",
                  "What are your export capabilities?",
                  "Do you offer bulk pricing?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setMessage(suggestion)}
                    className="text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-full px-3 py-1.5 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Message input */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Write your message..."
              className="w-full bg-white/[0.05] border border-white/[0.08] focus:border-green-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors resize-none mb-4"
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-900 disabled:text-green-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
              >
                {sending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  : <><MessageSquare className="w-4 h-4" /> Send Message</>
                }
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-3 text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl text-sm font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
