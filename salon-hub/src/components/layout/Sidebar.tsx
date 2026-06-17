import { NavLink, useLocation } from "react-router-dom";
import {
  Users,
  Package,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { LanguageModal } from "./LanguageModal";
import { useBusinessId } from "@/hooks/useBusinessId";

// Custom Calendar Icon Component
const CalendarIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.5 13h0.75c0.1989 0 0.3897 0.079 0.5303 0.2197 0.1407 0.1406 0.2197 0.3314 0.2197 0.5303V19" />
      <path d="M10.5 19h3" />
      <path d="M2.25 3.75h19.5s1.5 0 1.5 1.5v16.5s0 1.5 -1.5 1.5H2.25s-1.5 0 -1.5 -1.5V5.25s0 -1.5 1.5 -1.5Z" />
      <path d="M0.75 9.75h22.5" />
      <path d="M6.75 6V0.75" />
      <path d="M17.25 6V0.75" />
    </svg>
  );
};

// Custom Task/Sales Icon Component
const TaskIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.25 21.75h-6" />
      <path d="M8.75 13.25h6.5" />
      <path d="M8.75 9.75h6.5" />
      <path d="M8.75 6.25h6.5" />
      <path d="M20.25 0.75h-1.5v5.5h4.5v-2.5c0 -0.79565 -0.3161 -1.55871 -0.8787 -2.12132C21.8087 1.06607 21.0456 0.75 20.25 0.75Z" />
      <path d="M13.5 17.25H3.75c-0.79565 0 -1.55871 0.3161 -2.12132 0.8787C1.06607 18.6913 0.75 19.4544 0.75 20.25v3h10.5V19.5c0 -0.5967 0.2371 -1.169 0.659 -1.591 0.422 -0.4219 0.9943 -0.659 1.591 -0.659Zm0 0c0.5967 0 1.169 0.2371 1.591 0.659 0.4219 0.422 0.659 0.9943 0.659 1.591v0.75c0 0.3978 0.158 0.7794 0.4393 1.0607s0.6629 0.4393 1.0607 0.4393c0.3978 0 0.7794 -0.158 1.0607 -0.4393s0.4393 -0.6629 0.4393 -1.0607V0.75H8.25c-0.79565 0 -1.55871 0.31607 -2.12132 0.87868C5.56607 2.19129 5.25 2.95435 5.25 3.75v13.5" />
    </svg>
  );
};

// Custom Item & Category Icon Component
const ItemCategoryIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.05298 20.25h3" />
      <path d="M6.05298 4.5v9" />
      <path d="M0.802979 9H11.303" />
      <path d="m3.80298 0.75 2.25 3.75" />
      <path d="m8.30298 0.75 -2.25 3.75" />
      <path d="M15.8 23.25c0 -0.7956 -0.316 -1.5587 -0.8786 -2.1213 -0.5626 -0.5626 -1.3257 -0.8787 -2.1214 -0.8787H9.05305c0 -0.7956 -0.31607 -1.5587 -0.87868 -2.1213 -0.56261 -0.5626 -1.32567 -0.8787 -2.12132 -0.8787H0.800049v6H15.8Z" />
      <path d="M1.30298 4.5H10.803s0.5 0 0.5 0.5v8s0 0.5 -0.5 0.5H1.30298s-0.500001 0 -0.500001 -0.5V5s0 -0.5 0.500001 -0.5Z" />
      <path d="m13.86 8.57502 0.357 -2.675c0.0238 -0.18018 0.1123 -0.34557 0.249 -0.46535 0.1367 -0.11977 0.3123 -0.18575 0.494 -0.18565h6.187c0.1818 -0.0001 0.3574 0.06588 0.4941 0.18565 0.1367 0.11978 0.2252 0.28517 0.2489 0.46535l1.3 9.74998c0.0117 0.1055 0.0013 0.2122 -0.0305 0.3134 -0.0317 0.1013 -0.0842 0.1948 -0.1541 0.2746 -0.0699 0.0799 -0.1556 0.1443 -0.2517 0.1892 -0.0962 0.045 -0.2006 0.0694 -0.3067 0.0718H12.8" />
      <path d="M15.8 5.25v-1.5c0 -0.59674 0.2371 -1.16903 0.6591 -1.59099C16.881 1.73705 17.4533 1.5 18.05 1.5c0.5968 0 1.1691 0.23705 1.591 0.65901 0.422 0.42196 0.659 0.99425 0.659 1.59099v1.5" />
    </svg>
  );
};

// Custom Marketing Icon Component
const MarketingIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.773 2.284h20.454s1.023 0 1.023 1.023v14.318s0 1.023 -1.023 1.023H1.773s-1.023 0 -1.023 -1.023V3.307s0 -1.023 1.023 -1.023Z" />
      <path d="M11.489 18.648v3.068" />
      <path d="M7.39795 21.716h8.18195" />
      <path d="m10.555 13.728 -1.106 0.523c-0.24196 0.1145 -0.5041 0.1802 -0.77147 0.1934 -0.26736 0.0132 -0.53471 -0.0263 -0.78677 -0.1165 -0.25207 -0.0901 -0.48392 -0.229 -0.68231 -0.4087 -0.19839 -0.1797 -0.35943 -0.3967 -0.47395 -0.6387 -0.11451 -0.242 -0.18024 -0.5041 -0.19345 -0.7715 -0.0132 -0.2673 0.02639 -0.5347 0.11651 -0.7868 0.09012 -0.252 0.22901 -0.4839 0.40873 -0.6823 0.17972 -0.1983 0.39675 -0.3594 0.63871 -0.4739l1.106 -0.524 1.744 3.686Z" />
      <path d="M10.555 13.728c2.162 -1.0231 4.5785 -1.3836 6.945 -1.036l0.733 0.108L14.4 4.69098l-0.382 0.635C12.7866 7.37769 10.9751 9.0187 8.81201 10.042l1.74299 3.686Z" />
      <path d="M10.5551 13.728c0.2281 0.4828 0.552 0.9141 0.952 1.2677 0.4001 0.3536 0.8679 0.6222 1.375 0.7893" />
    </svg>
  );
};

// Custom Coupon Icon Component
const CouponIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.75 19c0 0.862 0.3424 1.6886 0.9519 2.2981 0.6095 0.6095 1.4361 0.9519 2.2981 0.9519 0.862 0 1.6886 -0.3424 2.2981 -0.9519 0.6095 -0.6095 0.9519 -1.4361 0.9519 -2.2981 0 -0.862 -0.3424 -1.6886 -0.9519 -2.2981 -0.6095 -0.6095 -1.4361 -0.9519 -2.2981 -0.9519 -0.862 0 -1.6886 0.3424 -2.2981 0.9519 -0.6095 0.6095 -0.9519 1.4361 -0.9519 2.2981Z" />
      <path d="M1.75 5c0 0.86195 0.34241 1.6886 0.9519 2.2981C3.3114 7.90759 4.13805 8.25 5 8.25c0.86195 0 1.6886 -0.34241 2.2981 -0.9519C7.90759 6.6886 8.25 5.86195 8.25 5c0 -0.86195 -0.34241 -1.6886 -0.9519 -2.2981C6.6886 2.09241 5.86195 1.75 5 1.75c-0.86195 0 -1.6886 0.34241 -2.2981 0.9519C2.09241 3.3114 1.75 4.13805 1.75 5Z" />
      <path d="M3.30998 23.2501c-0.1006 -0.004 -0.19937 -0.0281 -0.29043 -0.0711 -0.09105 -0.0429 -0.17253 -0.1038 -0.23957 -0.1789l-1.78 -1.78c-0.140451 -0.1406 -0.21934 -0.3312 -0.21934 -0.53 0 -0.1987 0.078889 -0.3894 0.21934 -0.53L20.16 1.0001c0.1406 -0.140449 0.3312 -0.219338 0.53 -0.219338 0.1987 0 0.3894 0.078889 0.53 0.219338l1.78 1.78c0.1404 0.14063 0.2193 0.33125 0.2193 0.53 0 0.19875 -0.0789 0.38938 -0.2193 0.53l-19.16002 19.16c-0.06704 0.0751 -0.14852 0.136 -0.23957 0.1789 -0.09106 0.043 -0.18983 0.0671 -0.29043 0.0711Z" />
    </svg>
  );
};

// Custom Analytics Icon Component
const AnalyticsIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.69003 13.5198c0.1651 0.2502 0.39139 0.4542 0.6574 0.5924 0.26601 0.1383 0.56293 0.2063 0.8626 0.1976 0.4093 0.0363 0.81637 -0.0904 1.1328 -0.3526 0.31643 -0.2621 0.51666 -0.6385 0.5572 -1.0474 -0.03808 -0.4107 -0.23725 -0.7896 -0.55396 -1.0538 -0.3167 -0.2643 -0.72517 -0.3923 -1.13604 -0.3562 -0.40923 0.0334 -0.81512 -0.096 -1.12962 -0.3599 -0.3145 -0.264 -0.51226 -0.6413 -0.55038 -1.0501 0.04058 -0.407 0.23939 -0.7818 0.55362 -1.04365 0.31422 -0.26186 0.71872 -0.38982 1.12638 -0.35634 0.30014 -0.0116 0.59813 0.05514 0.86464 0.19366 0.26652 0.13852 0.49238 0.34404 0.65536 0.59634" />
      <path d="M8.21002 14.3101v0.94" />
      <path d="M8.21002 7.75v0.94" />
      <path d="M14 15.25v-3" />
      <path d="M17.5 15.25v-6" />
      <path d="M1.5 0.75h21s0.75 0 0.75 0.75V4s0 0.75 -0.75 0.75h-21S0.75 4.75 0.75 4V1.5s0 -0.75 0.75 -0.75Z" />
      <path d="M2.25 4.75h19.5V18H2.25V4.75Z" />
      <path d="M12 22.25V18" />
      <path d="M0.75 18h22.5" />
      <path d="M13.5 23.25c0 -0.55 -0.67 -1 -1.5 -1s-1.5 0.45 -1.5 1" />
    </svg>
  );
};

// Custom Staff Icon Component
const StaffIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.249 20.25h-1c-0.1351 -0.0026 -0.2636 -0.0588 -0.3574 -0.1561 -0.0937 -0.0973 -0.145 -0.2278 -0.1426 -0.3629V3.518c-0.0012 -0.06685 0.0108 -0.13327 0.0353 -0.19548 0.0244 -0.06221 0.0609 -0.11899 0.1074 -0.1671 0.0464 -0.0481 0.1019 -0.08658 0.1632 -0.11325 0.0613 -0.02667 0.1272 -0.041 0.1941 -0.04217h1" />
      <path d="M10.499 12h2.25" />
      <path d="M17.249 3c0 0.29547 0.0582 0.58806 0.1713 0.86104s0.2788 0.52102 0.4877 0.72995c0.209 0.20893 0.457 0.37467 0.73 0.48774 0.273 0.11307 0.5655 0.17127 0.861 0.17127s0.5881 -0.0582 0.8611 -0.17127c0.2729 -0.11307 0.521 -0.27881 0.7299 -0.48774 0.2089 -0.20893 0.3747 -0.45697 0.4878 -0.72995 0.113 -0.27298 0.1712 -0.56557 0.1712 -0.86104s-0.0582 -0.58806 -0.1712 -0.86104c-0.1131 -0.27298 -0.2789 -0.52102 -0.4878 -0.72995 -0.2089 -0.20893 -0.457 -0.37467 -0.7299 -0.487739C20.0871 0.808198 19.7945 0.75 19.499 0.75s-0.588 0.058198 -0.861 0.171271c-0.273 0.113069 -0.521 0.278809 -0.73 0.487739 -0.2089 0.20893 -0.3746 0.45697 -0.4877 0.72995 -0.1131 0.27298 -0.1713 0.56557 -0.1713 0.86104Z" />
      <path d="M23.249 9c-0.2228 -0.83474 -0.707 -1.57625 -1.3815 -2.11605C21.1929 6.34414 20.3633 6.03439 19.5 6c-0.8635 0.03418 -1.6933 0.34384 -2.3681 0.88366C16.4572 7.42348 15.9729 8.16511 15.75 9h7.499Z" />
      <path d="M17.249 17.25c0 0.2955 0.0582 0.5881 0.1713 0.861 0.1131 0.273 0.2788 0.5211 0.4877 0.73 0.209 0.2089 0.457 0.3747 0.73 0.4877 0.273 0.1131 0.5655 0.1713 0.861 0.1713s0.5881 -0.0582 0.8611 -0.1713c0.2729 -0.113 0.521 -0.2788 0.7299 -0.4877 0.2089 -0.2089 0.3747 -0.457 0.4878 -0.73 0.113 -0.2729 0.1712 -0.5655 0.1712 -0.861s-0.0582 -0.5881 -0.1712 -0.861c-0.1131 -0.273 -0.2789 -0.5211 -0.4878 -0.73 -0.2089 -0.2089 -0.457 -0.3747 -0.7299 -0.4877 -0.273 -0.1131 -0.5656 -0.1713 -0.8611 -0.1713s-0.588 0.0582 -0.861 0.1713c-0.273 0.113 -0.521 0.2788 -0.73 0.4877 -0.2089 0.2089 -0.3746 0.457 -0.4877 0.73 -0.1131 0.2729 -0.1713 0.5655 -0.1713 0.861Z" />
      <path d="M23.249 23.25c-0.2229 -0.8349 -0.7071 -1.5765 -1.3819 -2.1163 -0.6748 -0.5399 -1.5046 -0.8495 -2.3681 -0.8837 -0.8634 0.0342 -1.6933 0.3438 -2.3681 0.8837 -0.6747 0.5398 -1.159 1.2814 -1.3819 2.1163h7.5Z" />
      <path d="M2.24902 9c0 0.79565 0.31607 1.5587 0.87868 2.1213 0.56261 0.5626 1.32567 0.8787 2.12132 0.8787s1.55871 -0.3161 2.12132 -0.8787c0.56261 -0.5626 0.87868 -1.32565 0.87868 -2.1213 0 -0.79565 -0.31607 -1.55871 -0.87868 -2.12132C6.80773 6.31607 6.04467 6 5.24902 6s-1.55871 0.31607 -2.12132 0.87868C2.56509 7.44129 2.24902 8.20435 2.24902 9Z" />
      <path d="M0.749023 18c0 -1.1935 0.474107 -2.3381 1.318017 -3.182 0.84392 -0.8439 1.98851 -1.318 3.18198 -1.318 1.19348 0 2.33807 0.4741 3.18198 1.318 0.84392 0.8439 1.31802 1.9885 1.31802 3.182H0.749023Z" />
    </svg>
  );
};

// Custom Business Icon Component
const BusinessIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M0.754028 6.86902V23.244H23.254V6.86902" />
      <path d="M4.06702 10.023v6.062H19.942v-6.083" />
      <path d="m8.24597 6.86105 1.318 -6.087002" />
      <path d="M3.49197 0.755981H20.516c0.2044 -0.000039 0.4042 0.0612 0.5736 0.175813 0.1693 0.114616 0.3004 0.277346 0.3764 0.467186l1.788 5.47c0 4.21202 -7.508 4.20002 -7.508 -0.008 0 4.21202 -7.50003 4.21002 -7.50003 0 0 4.21202 -7.499998 4.21002 -7.499998 0l1.795998 -5.461c0.0758 -0.19003 0.20683 -0.35297 0.37618 -0.467772 0.16935 -0.1148 0.36923 -0.176186 0.57382 -0.176227Z" />
      <path d="M15.746 6.86105 14.444 0.774048" />
      <path d="M5.58099 16.479v6.575" />
      <path d="M18.427 16.479v6.575" />
      <path d="M12.004 16.479v6.575" />
      <path d="M0.992981 6.11096H23.006" />
    </svg>
  );
};

// Custom Settings Icon Component
const SettingsIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.546 2.43804c0.1835 0.20369 0.4077 0.36656 0.6582 0.47805 0.2505 0.11148 0.5216 0.16909 0.7958 0.16909 0.2741 0 0.5453 -0.05761 0.7957 -0.16909 0.2505 -0.11149 0.4748 -0.27436 0.6583 -0.47805l0.946 -1.038c0.2711 -0.30006 0.6284 -0.508863 1.023 -0.597745 0.3945 -0.088881 0.8068 -0.053489 1.1804 0.10132 0.3736 0.154805 0.6902 0.421445 0.9062 0.763315 0.216 0.34187 0.3209 0.74222 0.3004 1.14611l-0.071 1.39999c-0.0138 0.27311 0.0299 0.54607 0.128 0.80129 0.0982 0.25522 0.2488 0.48705 0.442 0.68055s0.4248 0.34438 0.6799 0.44293c0.2551 0.09854 0.528 0.14257 0.8011 0.12924l1.4 -0.071c0.4036 -0.0199 0.8035 0.08551 1.1449 0.30178 0.3413 0.21628 0.6075 0.53283 0.7619 0.90628 0.1544 0.37345 0.1895 0.78551 0.1006 1.17972 -0.0889 0.3942 -0.2976 0.75125 -0.5974 1.02222l-1.042 0.93996c-0.2035 0.1838 -0.3661 0.4082 -0.4774 0.6587 -0.1113 0.2506 -0.1688 0.5217 -0.1688 0.7958 0 0.2742 0.0575 0.5453 0.1688 0.7958 0.1113 0.2506 0.2739 0.475 0.4774 0.6587l1.042 0.94c0.3 0.2712 0.5088 0.6285 0.5977 1.023 0.0889 0.3945 0.0535 0.8069 -0.1013 1.1805 -0.1548 0.3736 -0.4214 0.6901 -0.7633 0.9061 -0.3419 0.2161 -0.7422 0.321 -1.1461 0.3004l-1.4 -0.071c-0.2737 -0.014 -0.5474 0.0295 -0.8032 0.1278 -0.2558 0.0984 -0.4881 0.2493 -0.6819 0.4431 -0.1938 0.1938 -0.3448 0.4262 -0.4431 0.682 -0.0984 0.2558 -0.1419 0.5294 -0.1278 0.8031l0.071 1.4c0.0179 0.4019 -0.0884 0.7995 -0.3043 1.1389 -0.2159 0.3394 -0.5311 0.604 -0.9027 0.758 -0.3716 0.1541 -0.7816 0.1899 -1.1743 0.1028 -0.3927 -0.0871 -0.7491 -0.293 -1.0207 -0.5897l-0.941 -1.041c-0.1837 -0.2034 -0.408 -0.366 -0.6585 -0.4773 -0.2504 -0.1113 -0.5214 -0.1688 -0.7955 -0.1688s-0.5451 0.0575 -0.7956 0.1688c-0.2504 0.1113 -0.4747 0.2739 -0.6584 0.4773L9.60598 22.6c-0.27119 0.2981 -0.62771 0.5053 -1.02095 0.5934 -0.39325 0.088 -0.80409 0.0527 -1.17651 -0.1013 -0.37242 -0.1539 -0.68829 -0.419 -0.90457 -0.759 -0.21628 -0.34 -0.32242 -0.7385 -0.30397 -1.1411l0.072 -1.4c0.01408 -0.2737 -0.02946 -0.5473 -0.1278 -0.8031 -0.09835 -0.2558 -0.2493 -0.4882 -0.4431 -0.682 -0.1938 -0.1938 -0.42613 -0.3447 -0.68195 -0.4431 -0.25582 -0.0983 -0.52944 -0.1418 -0.80315 -0.1278l-1.4 0.071c-0.40372 0.0211 -0.80406 -0.0833 -1.14606 -0.2989 -0.34201 -0.2155 -0.60891 -0.5316 -0.764058 -0.9049 -0.155152 -0.3734 -0.19095 -0.7855 -0.102478 -1.18 0.088471 -0.3945 0.296876 -0.7519 0.596596 -1.0232l1.041 -0.94c0.20345 -0.1837 0.36608 -0.4081 0.47739 -0.6587 0.11131 -0.2505 0.16883 -0.5216 0.16883 -0.7958 0 -0.2741 -0.05752 -0.5452 -0.16883 -0.7958 -0.11131 -0.2505 -0.27394 -0.4749 -0.47739 -0.6587l-1.041 -0.94496c-0.29875 -0.271 -0.506517 -0.62765 -0.594899 -1.0212 -0.088382 -0.39355 -0.053066 -0.80479 0.101121 -1.17751 0.154188 -0.37272 0.419718 -0.68872 0.760298 -0.90482 0.34058 -0.21609 0.73959 -0.32173 1.14248 -0.30247l1.4 0.071c0.27423 0.01441 0.54842 -0.02901 0.80478 -0.12747 0.25635 -0.09845 0.48913 -0.24972 0.68321 -0.44399 0.19408 -0.19427 0.34513 -0.4272 0.44333 -0.68364 0.0982 -0.25645 0.14136 -0.53069 0.12668 -0.8049l-0.067 -1.40101c-0.01889 -0.40273 0.08693 -0.80149 0.30304 -1.14185 0.21611 -0.34037 0.53198 -0.60577 0.9045 -0.759982 0.37252 -0.154214 0.78355 -0.189733 1.177 -0.10171 0.39345 0.088022 0.75016 0.295302 1.02146 0.593552l0.94002 1.038Z" />
      <path d="M7.5 12.001c0 1.1935 0.47411 2.338 1.31802 3.182 0.84391 0.8439 1.98848 1.318 3.18198 1.318 1.1935 0 2.3381 -0.4741 3.182 -1.318 0.8439 -0.844 1.318 -1.9885 1.318 -3.182s-0.4741 -2.33809 -1.318 -3.182c-0.8439 -0.84392 -1.9885 -1.31802 -3.182 -1.31802s-2.33807 0.4741 -3.18198 1.31802C7.97411 9.66291 7.5 10.8075 7.5 12.001Z" />
    </svg>
  );
};

// Custom Help Icon Component
const HelpIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      width={size} 
      height={size}
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.25 16.5h-0.75c-0.3978 0 -0.7794 -0.158 -1.0607 -0.4393S12 15.3978 12 15v-3.75c0 -0.1989 -0.079 -0.3897 -0.2197 -0.5303 -0.1406 -0.1407 -0.3314 -0.2197 -0.5303 -0.2197h-0.75" />
      <path d="M11.625 7.5c-0.2071 0 -0.375 -0.16789 -0.375 -0.375s0.1679 -0.375 0.375 -0.375" />
      <path d="M11.625 7.5c0.2071 0 0.375 -0.16789 0.375 -0.375s-0.1679 -0.375 -0.375 -0.375" />
      <path d="M12 23.25c6.2132 0 11.25 -5.0368 11.25 -11.25S18.2132 0.75 12 0.75 0.75 5.7868 0.75 12 5.7868 23.25 12 23.25Z" />
    </svg>
  );
};

// Custom Globe Icon Component
const GlobeIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fillRule="evenodd">
        <circle cx="12" cy="12" r="12" fill="currentColor" />
        <path d="M15.094 13.978c-1.146 0-1.946-.813-1.946-1.978s.8-1.978 1.946-1.978c1.145 0 1.945.813 1.945 1.978s-.8 1.978-1.945 1.978M9.07 10.022h3.883l-.094.09c-.537.515-.844 1.203-.844 1.888 0 1.738 1.294 3 3.079 3 1.786 0 3.082-1.262 3.082-3s-1.296-3-3.082-3H9.079C7.295 9 6 10.262 6 12s1.295 3 3.079 3h2.144v-1.022H9.07c-1.136 0-1.932-.813-1.937-1.978 0-1.146.815-1.978 1.937-1.978" fill="white" />
      </g>
    </svg>
  );
};

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

// Language options for flag display
const languages = [
  { code: "en-US", name: "English (United States)", flag: "🇺🇸" },
  { code: "en-GB", name: "English (Great Britain)", flag: "🇬🇧" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "es-ES", name: "Spanish (Spain)", flag: "🇪🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "pt-BR", name: "Portuguese (Brazil)", flag: "🇧🇷" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "uk", name: "Ukrainian", flag: "🇺🇦" },
  { code: "zh-CN", name: "Simplified Chinese", flag: "🇨🇳" },
];

// Matching the image structure
const navItems: NavItem[] = [
  { icon: CalendarIcon, label: "Calendar", path: "/calendar" },
  { icon: TaskIcon, label: "Sales", path: "/sales" },
  { icon: ItemCategoryIcon, label: "Item & Category", path: "/items-category" },
  { icon: Users, label: "Clients", path: "/clients" },
  // { icon: Package, label: "Inventory", path: "/inventory" }, // Disabled
  // { icon: MarketingIcon, label: "Marketing", path: "/marketing" }, // Disabled
  // { icon: CouponIcon, label: "Coupon", path: "/contacts" }, // Disabled
  { icon: AnalyticsIcon, label: "Analytics", path: "/analytics" },
  { icon: StaffIcon, label: "Staff", path: "/staff" },
  { icon: BusinessIcon, label: "Business", path: "/business" },
  { icon: SettingsIcon, label: "Settings", path: "/setup" },
  // { icon: HelpIcon, label: "Help", path: "/help" }, // Disabled
];

export function Sidebar() {
  const location = useLocation();
  const businessId = useBusinessId();
  const [selectedLanguage, setSelectedLanguage] = useState("pl");
  const [selectedTheme, setSelectedTheme] = useState("light");
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  
  // Helper function to get the full path with businessId
  const getPath = (path: string): string => {
    // If we're in a business-specific route, prepend businessId
    if (businessId > 0 && path !== "/") {
      return `/${businessId}${path}`;
    }
    return path;
  };

  // Get current language flag component
  const getLanguageFlagComponent = (code: string) => {
    if (code === "pl") {
      return (
        <div className="w-full h-full">
          <div className="h-1/2 bg-white"></div>
          <div className="h-1/2 bg-red-600"></div>
        </div>
      );
    }
    // For other languages, show emoji flag
    const lang = languages.find(l => l.code === code);
    return (
      <div className="w-full h-full flex items-center justify-center text-base leading-none">
        {lang?.flag || "🇵🇱"}
      </div>
    );
  };

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 h-screen w-[72px] bg-[#1a1a1a] border-r border-[#2a2a2a]/50 flex flex-col relative">
        {/* Top Section - Language Selector */}
        <div className="flex flex-col items-center pt-4 pb-2 border-b border-[#2a2a2a]/50">
          <div className="relative group">
            <div 
              onClick={() => setIsLanguageModalOpen(true)}
              className="flex flex-col items-center gap-1.5 cursor-pointer px-2 py-2 rounded hover:bg-white/5 transition-colors"
            >
              {/* Current Language Flag - Circular */}
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-sm">
                {getLanguageFlagComponent(selectedLanguage)}
              </div>
              <ChevronDown className="h-3 w-3 text-white/50" />
            </div>
          </div>
      </div>

        {/* Divider between flag and navigation */}
        <div className="w-full h-px bg-[#2a2a2a]/50"></div>

      {/* Main Navigation - Icon Only */}
      <nav className="flex-1 flex flex-col items-center py-2 gap-0.5 overflow-y-auto relative">
        {navItems.map((item) => {
          const fullPath = getPath(item.path);
          // Check if current path matches the full path or if it's a business route
          const isActive = location.pathname === fullPath || 
            location.pathname.startsWith(fullPath + "/") ||
            (item.path === "/business" && location.pathname === `/${businessId}`) ||
            (item.path === "/business" && location.pathname === "/");
          const Icon = item.icon;

          return (
            <Tooltip key={item.path} delayDuration={200}>
              <TooltipTrigger asChild>
                <NavLink
                  to={fullPath}
                  className={cn(
                    "group relative flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200",
                    !isActive && "hover:bg-white/5"
                  )}
                >
                  {/* Active indicator - full height line on absolute left of sidebar */}
                  {isActive && (
                    <div className="absolute left-[-12px] top-0 bottom-0 w-1 bg-[#f4f4f4]" />
                  )}
                  {item.icon === CalendarIcon ? (
                    <CalendarIcon 
                      size={24}
                      className={cn(
                        "transition-all duration-200",
                        isActive ? "text-[#f4f4f4]" : "text-[#7f8084] group-hover:text-[#7f8084]"
                      )}
                    />
                  ) : item.icon === TaskIcon ? (
                    <TaskIcon 
                      size={24}
                      className={cn(
                        "transition-all duration-200",
                        isActive ? "text-[#f4f4f4]" : "text-[#7f8084] group-hover:text-[#7f8084]"
                      )}
                    />
                  ) : item.icon === MarketingIcon ? (
                    <MarketingIcon 
                      size={24}
                      className={cn(
                        "transition-all duration-200",
                        isActive ? "text-[#f4f4f4]" : "text-[#7f8084] group-hover:text-[#7f8084]"
                      )}
                    />
                  ) : item.icon === CouponIcon ? (
                    <CouponIcon 
                      size={24}
                      className={cn(
                        "transition-all duration-200",
                        isActive ? "text-[#f4f4f4]" : "text-[#7f8084] group-hover:text-[#7f8084]"
                      )}
                    />
                  ) : (
                    <Icon 
                      size={24}
                      className={cn(
                        "transition-all duration-200",
                        isActive ? "text-[#f4f4f4]" : "text-[#7f8084] group-hover:text-[#7f8084]"
                      )}
                    />
                  )}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1a1a1a] text-white border-none px-3 py-1.5 text-sm">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom Section - Theme Selector */}
      <div className="flex flex-col items-center gap-2.5 pt-2 pb-4 border-t border-[#2a2a2a]/50">
        {/* Link/Chain Icon */}
        <div className="w-10 h-10 rounded-full border border-white/20 bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors group">
          <GlobeIcon size={16} className="text-white/40 group-hover:text-white/60" />
        </div>
        
        {/* Theme Selector */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full border border-white/20 bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
            <span className="text-[8px] font-semibold text-white/40 uppercase tracking-wider">THEM</span>
          </div>
        </div>
      </div>
    </aside>

      {/* Language Selection Modal */}
      <LanguageModal
        open={isLanguageModalOpen}
        onOpenChange={setIsLanguageModalOpen}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />
    </>
  );
}
