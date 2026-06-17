import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { businessService } from "@/services/businessService";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const authResponse = await authService.login({
        email,
        password,
      });

      const { accessToken, user, business } = authResponse;

      // Store tokens in localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", authResponse.refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      // Store business data if available in response
      if (business && business.id) {
        localStorage.setItem("currentBusinessId", business.id.toString());
        localStorage.setItem("currentBusiness", JSON.stringify(business));
        console.log("Business stored from login response:", business.id);
      } else if (user && user.role === "BUSINESS_OWNER") {
        // If business is not in response and user is a business owner, try to fetch it
        // This is a fallback - the backend should include business in login response
        try {
          console.log("Business not in login response, fetching for owner:", user.id);
          const businesses = await businessService.getBusinessesByOwner(
            user.id,
            accessToken
          );
          if (businesses && businesses.length > 0) {
            const firstBusiness = businesses[0];
            localStorage.setItem(
              "currentBusinessId",
              firstBusiness.id.toString()
            );
            localStorage.setItem(
              "currentBusiness",
              JSON.stringify(firstBusiness)
            );
            console.log("Business fetched and stored:", firstBusiness.id);
          } else {
            console.warn("No businesses found for user:", user.id);
          }
        } catch (err) {
          console.warn("Could not fetch business after login (this is non-critical):", err);
          // Don't fail login if business fetch fails - user can still access the app
          // Business can be fetched later when needed
        }
      }

      toast.success("Login successful! Welcome back!");
      
      // Redirect to portal (home page)
      navigate("/");
    } catch (error: any) {
      console.error("Login error:", error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.status,
        error: error
      });
      
      // Try to extract error message from various sources
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.message) {
        errorMessage = error.response.message;
      } else if (error?.response?.error) {
        errorMessage = error.response.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-gray-900 font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;





