import { ajoData } from "@/temp-data";
import { formatAddress } from "@/utils/utils";
import {
  Bell,
  CheckCircle,
  Clock,
  CreditCard,
  Database,
  ExternalLink,
  Star,
  Users,
  Zap,
} from "lucide-react";

interface AjoDetailsCardProps {
  isVisible?: boolean;
  lastUpdated: Date;
}

const AjoDetailsCard = ({ isVisible, lastUpdated }: AjoDetailsCardProps) => {
  return (
    <div
      className={`mb-8 transform transition-all duration-1000 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-xl font-bold text-primary-foreground">
                {ajoData.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-card-foreground mb-1">
                  {ajoData.name}
                </h1>
                <div className="flex items-center space-x-4">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(
                      ajoData.status
                    )}`}
                  >
                    {getStatusIcon(ajoData.status)}
                    <span className="capitalize">{ajoData.status}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-accent fill-current" />
                    <span className="font-semibold text-card-foreground">
                      {ajoData.reputation}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    by {formatAddress(ajoData.creator)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {ajoData.description}
            </p>

            <div className="mt-4 flex items-center space-x-2 text-sm">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Smart Contract:</span>
              <span className="font-mono text-primary">
                {formatAddress(ajoData.contracts.core)}
              </span>
              <button className="text-primary hover:text-primary/80">
                <ExternalLink className="w-4 h-4" />
              </button>
              <span className="text-muted-foreground ml-4">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Make Payment</span>
            </button>
            <button className="border border-primary text-primary hover:bg-primary/10 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Subscribe</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjoDetailsCard;

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <Zap className="w-4 h-4" />;
    case "forming":
      return <Users className="w-4 h-4" />;
    case "completed":
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-600 text-white border border-green-500";
    case "forming":
      return "bg-accent/20 text-accent border border-accent/30";
    case "completed":
      return "bg-secondary/20 text-secondary-foreground border border-secondary/30";
    default:
      return "bg-muted/20 text-muted-foreground border border-muted/30";
  }
};
