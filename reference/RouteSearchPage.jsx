import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export const RouteSearchPage = () => {
  const [origin, setOrigin] = useState("Mangalore Central");
  const [destination, setDestination] = useState("Udupi");
  const [time, setTime] = useState("");
  const [maxFare, setMaxFare] = useState("");
  const [minSeats, setMinSeats] = useState("");
  const [stops, setStops] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const stopOptions = useMemo(() => stops.map((stop) => stop.name), [stops]);

  useEffect(() => {
    const loadStops = async () => {
      try {
        const response = await api.get("/stops");
        setStops(response.data);
      } catch (error) {
        toast.error("Unable to load stop list");
      }
    };
    loadStops();
  }, []);

  const searchRoutes = async () => {
    if (!origin || !destination) {
      toast.error("Select both origin and destination");
      return;
    }
    try {
      setLoading(true);
      const response = await api.get("/routes/search", {
        params: {
          origin,
          destination,
          time: time || undefined,
          max_fare: maxFare || undefined,
          min_seats: minSeats || 0,
        },
      });
      setResults(response.data);
      if (!response.data.length) {
        toast.info("No matching buses for selected filters");
      }
    } catch (error) {
      toast.error("Route search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell title="Search Route" subtitle="Choose stops, compare fares, and open live bus pages">
      <section data-testid="route-search-form-section" className="ticket-stub rounded-lg p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            list="stop-options"
            data-testid="route-origin-input"
            className="h-12 border-2 border-slate-300"
            placeholder="Origin"
          />
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            list="stop-options"
            data-testid="route-destination-input"
            className="h-12 border-2 border-slate-300"
            placeholder="Destination"
          />
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            data-testid="route-time-filter-input"
            className="h-12 border-2 border-slate-300"
          />
          <Input
            type="number"
            value={maxFare}
            onChange={(e) => setMaxFare(e.target.value)}
            data-testid="route-max-fare-filter-input"
            className="h-12 border-2 border-slate-300"
            placeholder="Max fare ₹"
          />
          <Input
            type="number"
            value={minSeats}
            onChange={(e) => setMinSeats(e.target.value)}
            data-testid="route-min-seats-filter-input"
            className="h-12 border-2 border-slate-300"
            placeholder="Min available seats"
          />
        </div>

        <datalist id="stop-options" data-testid="route-stop-datalist">
          {stopOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <Button
          onClick={searchRoutes}
          disabled={loading}
          data-testid="route-search-submit-button"
          className="mt-4 h-11 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-6 font-bold uppercase tracking-wider text-[#0D1B2A] hover:bg-amber-400"
        >
          <Search className="mr-2 h-4 w-4" />
          {loading ? "Searching..." : "Search Buses"}
        </Button>
      </section>

      <section data-testid="route-search-results-section" className="mt-8 space-y-4">
        {results.map((item) => (
          <Card
            key={item.bus_number}
            data-testid={`search-result-card-${item.bus_number.toLowerCase()}`}
            className="surface-card rounded-lg border-2 border-slate-200 bg-white transition-transform duration-300"
          >
            <CardContent className="grid gap-3 p-5 md:grid-cols-[1.3fr_1fr_auto] md:items-center">
              <div>
                <p data-testid={`search-result-bus-number-${item.bus_number.toLowerCase()}`} className="font-['Barlow_Condensed'] text-4xl font-extrabold leading-none text-[#0D1B2A]">
                  {item.bus_number}
                </p>
                <p data-testid={`search-result-route-${item.bus_number.toLowerCase()}`} className="mt-1 text-sm text-slate-600">
                  {item.origin} → {item.destination}
                </p>
                <p data-testid={`search-result-operator-${item.bus_number.toLowerCase()}`} className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                  {item.operator_name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-1">
                <p data-testid={`search-result-departure-${item.bus_number.toLowerCase()}`}>Departure: {item.departure_time}</p>
                <p data-testid={`search-result-fare-${item.bus_number.toLowerCase()}`} className="font-semibold text-[#0E7C86]">
                  Fare: ₹{item.fare}
                </p>
                <p data-testid={`search-result-seats-${item.bus_number.toLowerCase()}`}>Seats: {item.available_seats}</p>
                <p data-testid={`search-result-status-${item.bus_number.toLowerCase()}`}>Status: {item.status}</p>
              </div>

              <Button
                asChild
                data-testid={`search-result-open-bus-${item.bus_number.toLowerCase()}`}
                className="h-10 rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800"
              >
                <Link to={`/bus/${item.bus_number}?currentStop=${encodeURIComponent(origin)}`}>View Bus</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </AppShell>
  );
};
