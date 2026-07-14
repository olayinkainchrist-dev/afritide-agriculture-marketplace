import { useAuthStore } from "@/lib/store/auth.store";
import { authApi } from "@/lib/api/auth.api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export const useAuth = () => {
  const { user, isAuthenticated, setAuth, logout } = useAuthStore();
  const router = useRouter();

  const login = async (email: string, password: string) => {
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.data) {
        setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
        toast.success("Welcome back!");
        const role = res.data.user.role?.toUpperCase();
        if (role === "ADMIN") {
          router.push("/dashboard/admin");
        } else if (["FARMER", "COOPERATIVE", "EXPORTER", "PROCESSING_COMPANY", "LOGISTICS_PROVIDER", "WAREHOUSE_OPERATOR"].includes(role)) {
          router.push("/dashboard/farmer");
        } else {
          router.push("/dashboard/buyer");
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Login failed");
      throw err;
    }
  };

  const register = async (data: any) => {
    try {
      const res = await authApi.register(data);
      if (res.success) {
        toast.success("Account created! Please check your email for the OTP.");
        router.push(`/verify-otp?email=${data.email}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Registration failed");
      throw err;
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res = await authApi.verifyOtp({ email, otp });
      if (res.success) {
        toast.success("Email verified! You can now login.");
        router.push("/login");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
      throw err;
    }
  };

  return { user, isAuthenticated, login, register, verifyOtp, logout };
};