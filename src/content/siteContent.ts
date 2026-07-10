import { supportedCities, type SupportedCity } from "../lib/cities";

export { supportedCities };
export type { SupportedCity };

export const navItems = [
  { label: "Network", to: "/#network" },
  { label: "Safety", to: "/safety" },
  { label: "Cities", to: "/cities" },
  { label: "Manifesto", to: "/about" },
];

export interface BookingLocation {
  address: string;
  lat: number;
  lng: number;
  city: SupportedCity;
}

export const bookingLocations: BookingLocation[] = [
  { address: "Bandra Kurla Complex, Mumbai", lat: 19.0607, lng: 72.8633, city: "Mumbai" },
  { address: "Worli Sea Face, Mumbai", lat: 19.0069, lng: 72.8159, city: "Mumbai" },
  { address: "Andheri East, Mumbai", lat: 19.1136, lng: 72.8697, city: "Mumbai" },
  { address: "CST Station, Mumbai", lat: 18.9401, lng: 72.8347, city: "Mumbai" },
  { address: "Powai Lake, Mumbai", lat: 19.1291, lng: 72.911, city: "Mumbai" },
  { address: "Colaba Causeway, Mumbai", lat: 18.915, lng: 72.8256, city: "Mumbai" },
  { address: "Juhu Beach, Mumbai", lat: 19.0988, lng: 72.8264, city: "Mumbai" },
  { address: "Borivali West, Mumbai", lat: 19.2307, lng: 72.8567, city: "Mumbai" },
  { address: "Connaught Place, Delhi", lat: 28.6315, lng: 77.2167, city: "Delhi" },
  { address: "Hauz Khas Village, Delhi", lat: 28.5521, lng: 77.1948, city: "Delhi" },
  { address: "Saket District Centre, Delhi", lat: 28.5284, lng: 77.214, city: "Delhi" },
  { address: "Chandni Chowk, Delhi", lat: 28.6507, lng: 77.2334, city: "Delhi" },
  { address: "Karol Bagh, Delhi", lat: 28.6443, lng: 77.1895, city: "Delhi" },
  { address: "Dwarka Sector 21, Delhi", lat: 28.5517, lng: 77.0658, city: "Delhi" },
  { address: "Indiranagar 100ft Rd, Bangalore", lat: 12.9716, lng: 77.6412, city: "Bangalore" },
  { address: "Koramangala 4th Block, Bangalore", lat: 12.9317, lng: 77.6227, city: "Bangalore" },
  { address: "Whitefield ITPL, Bangalore", lat: 12.9845, lng: 77.7377, city: "Bangalore" },
  { address: "HSR Layout Sector 2, Bangalore", lat: 12.9105, lng: 77.645, city: "Bangalore" },
  { address: "MG Road Metro, Bangalore", lat: 12.9755, lng: 77.6067, city: "Bangalore" },
  { address: "JP Nagar 7th Phase, Bangalore", lat: 12.8956, lng: 77.5851, city: "Bangalore" },
  { address: "Gachibowli DLF, Hyderabad", lat: 17.4444, lng: 78.3489, city: "Hyderabad" },
  { address: "Jubilee Hills Check Post, Hyderabad", lat: 17.4278, lng: 78.4203, city: "Hyderabad" },
  { address: "Banjara Hills Rd 1, Hyderabad", lat: 17.4149, lng: 78.4503, city: "Hyderabad" },
  { address: "Hitech City Cyber Towers, Hyderabad", lat: 17.4504, lng: 78.3808, city: "Hyderabad" },
  { address: "Koregaon Park, Pune", lat: 18.5362, lng: 73.894, city: "Pune" },
  { address: "Viman Nagar, Pune", lat: 18.5679, lng: 73.9143, city: "Pune" },
  { address: "Hinjewadi Phase 1, Pune", lat: 18.5913, lng: 73.7389, city: "Pune" },
  { address: "Shivaji Nagar, Pune", lat: 18.5314, lng: 73.8446, city: "Pune" },
];

export const networkMetrics = [
  { value: "48k+", label: "shared seats routed each month" },
  { value: "5", label: "dense city networks live now" },
  { value: "14 min", label: "median wait for a viable match" },
  { value: "32%", label: "average commute savings per rider" },
];

export const routeSignals = [
  "Route intelligence",
  "Verified riders",
  "Fair split pricing",
  "Dense city clusters",
  "Safety controls",
  "Driver quality",
];

export const homePrinciples = [
  {
    step: "01",
    title: "Start with your corridor, not a vague pickup pin",
    body: "HopIn is built around repeated city movement: home to work, station to campus, late shift to residential cluster. That gives us better route density and cleaner pricing.",
  },
  {
    step: "02",
    title: "Match riders with overlapping intent",
    body: "We prioritize directional overlap, safety score, pickup reliability, and time tolerance so the ride feels coordinated instead of improvised.",
  },
  {
    step: "03",
    title: "Keep every interaction readable",
    body: "Drivers see useful demand. Riders see what matters: route fit, ETA, seat count, and the reason a fare looks the way it does.",
  },
];

export const routeStories = [
  {
    city: "Bangalore",
    corridor: "Indiranagar to ORR",
    body: "High repeat weekday demand, office clusters, and tight time windows make this corridor ideal for shared rides that still feel predictable.",
    stat: "1,920 weekly shared trips",
    image:
      "https://images.unsplash.com/photo-1511649475669-e288648b2339?auto=format&fit=crop&q=80&w=800",
  },
  {
    city: "Mumbai",
    corridor: "Powai to BKC",
    body: "Longer distance commutes benefit from fare splitting the most. We bias toward stable corridors where each additional seat actually lowers the pain of traffic.",
    stat: "27% average savings",
    image:
      "https://images.unsplash.com/photo-1598970434795-0c54fe7c0642?auto=format&fit=crop&q=80&w=800",
  },
  {
    city: "Hyderabad",
    corridor: "Gachibowli to Hitech City",
    body: "Dense tech campuses and late office hours let us stage reliable shared departures without adding unnecessary detours.",
    stat: "4.8 safety score",
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=800",
  },
];

export const cityCards = [
  {
    name: "Bangalore",
    status: "Live",
    rides: "21k monthly riders",
    coverage: ["Indiranagar", "Koramangala", "Whitefield", "Manyata", "HSR"],
    image:
      "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Mumbai",
    status: "Live",
    rides: "18k monthly riders",
    coverage: ["BKC", "Powai", "Andheri", "Worli", "Borivali"],
    image:
      "https://images.unsplash.com/photo-1562979314-bee7453e911c?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Delhi",
    status: "Live",
    rides: "16k monthly riders",
    coverage: ["CP", "Saket", "Hauz Khas", "Dwarka", "Karol Bagh"],
    image:
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Hyderabad",
    status: "Live",
    rides: "11k monthly riders",
    coverage: ["Gachibowli", "Hitech City", "Jubilee Hills", "Banjara Hills"],
    image:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Pune",
    status: "Live",
    rides: "9k monthly riders",
    coverage: ["Hinjewadi", "Koregaon Park", "Viman Nagar", "Shivaji Nagar"],
    image:
      "https://images.unsplash.com/photo-1566552881560-0be862a7c445?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "Chennai",
    status: "Next",
    rides: "launch requests open",
    coverage: ["OMR", "Guindy", "Velachery", "Anna Nagar"],
    image:
      "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=800",
  },
];

export const safetyLayers = [
  {
    label: "Identity",
    title: "Verified participants and structured trust signals",
    body: "Profiles carry role, verification state, trip history, and onboarding context so riders are not guessing who they are about to share a car with.",
  },
  {
    label: "Routing",
    title: "Match logic that avoids chaotic detours",
    body: "We prefer dense corridors with repeat demand, short pickup drift, and clear directionality. That is a safety feature as much as an efficiency feature.",
  },
  {
    label: "Trip",
    title: "Readable trip controls before, during, and after pickup",
    body: "Route summaries, vehicle details, rider counts, and status feedback all stay visible so the ride never feels opaque.",
  },
  {
    label: "Support",
    title: "Escalation paths designed for actual urgency",
    body: "Emergency actions, support access, and trip metadata are organized so a rider can move fast under stress without hunting for the right button.",
  },
];

export const manifestoPillars = [
  {
    title: "Build for repeated behavior",
    body: "Urban mobility products fail when they treat every trip like a one-off. Shared commuting works when the system learns the corridors people repeat every week.",
  },
  {
    title: "Show the math",
    body: "If a user cannot understand why a match and a fare are presented, trust degrades. HopIn should always explain the tradeoff it is asking a rider to accept.",
  },
  {
    title: "Design for calm, not gimmicks",
    body: "A commute product lives inside time pressure. The interface should absorb complexity, not perform it.",
  },
  {
    title: "Density over vanity scale",
    body: "Winning five cities deeply is better than pretending to serve twenty loosely. We build concentrated route networks first, then expand with discipline.",
  },
];

export const faqItems = [
  {
    question: "How does HopIn decide if a shared ride is a good match?",
    answer:
      "We look at route overlap, pickup drift, time tolerance, seat demand, and rider trust signals. The goal is not just filling a car, but creating a trip that still feels efficient.",
  },
  {
    question: "Do I need to be a daily commuter to use the platform?",
    answer:
      "No, but the experience gets better when you have repeat patterns. The matching model becomes more useful when it understands your typical city movement.",
  },
  {
    question: "What happens if my ride changes or I need to cancel?",
    answer:
      "You can cancel before pickup and the interface will reflect whether the change affects pricing or the driver's route. The product should make those consequences clear before you confirm.",
  },
  {
    question: "How do drivers benefit from the shared model?",
    answer:
      "Drivers get higher seat utilization on predictable routes, less dead mileage, and better visibility into the kind of requests they are accepting.",
  },
  {
    question: "Is the contact form live?",
    answer:
      "Yes. Messages are validated and submitted directly through the site so the support team can follow up from the HopIn queue.",
  },
];

export const jobOpenings = [
  {
    title: "Product Designer, Mobility Systems",
    location: "Bangalore",
    type: "Full-time",
    team: "Design",
  },
  {
    title: "Frontend Engineer, Rider Experience",
    location: "Remote / India",
    type: "Full-time",
    team: "Engineering",
  },
  {
    title: "City Operations Lead",
    location: "Mumbai",
    type: "Full-time",
    team: "Operations",
  },
  {
    title: "Safety and Trust Program Manager",
    location: "Hyderabad",
    type: "Full-time",
    team: "Trust",
  },
];

export const blogPosts = [
  {
    category: "Mobility",
    date: "May 8, 2026",
    title: "Why corridor density matters more than raw driver count",
    excerpt:
      "A shared ride network is only useful when the same routes become legible and repeatable. Scale without density creates noise, not reliability.",
    image:
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=800",
  },
  {
    category: "Safety",
    date: "May 1, 2026",
    title: "Designing trip controls for riders who are already in motion",
    excerpt:
      "Safety affordances need to be readable at a glance. We break down what should remain visible before pickup, during the ride, and at drop-off.",
    image:
      "https://images.unsplash.com/photo-1519583272095-6433daf26b6e?auto=format&fit=crop&q=80&w=800",
  },
  {
    category: "Cities",
    date: "April 22, 2026",
    title: "How we choose the next neighborhood before we launch it",
    excerpt:
      "Expansion is a routing problem before it is a marketing problem. We look for recurring demand, corridor symmetry, and pickup discipline.",
    image:
      "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&q=80&w=800",
  },
];
