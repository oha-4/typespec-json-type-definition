// A "kitchen sink" sample exercising every TypeSpec construct the JSON Type
// Definition emitter understands. Compile it with:
//
//   npx tsp compile . --config tspconfig.yaml
//
// @doc, @discriminator, and @discriminated are built-in TypeSpec decorators,
// so no import is needed — the emitter is selected via tspconfig.yaml.

@doc("Everything the JSON Type Definition emitter understands, in one file.")
namespace ShowCase;

// ---------------------------------------------------------------------------
// Aliases & custom scalars (resolved through their `extends` chain)
// ---------------------------------------------------------------------------

alias ID = string;

@doc("An RFC 5322 email address (emitted as a JTD `string`).")
scalar Email extends string;

@doc("A latitude in degrees (emitted as `float64`).")
scalar Latitude extends float64;

// ---------------------------------------------------------------------------
// Scalars
// ---------------------------------------------------------------------------

@doc("One property per cleanly mapped JTD scalar type.")
model Primitives {
  flag: boolean;
  text: string;
  link: url;
  blob: bytes;
  tiny: int8;
  small: int16;
  medium: int32;
  utiny: uint8;
  usmall: uint16;
  umedium: uint32;
  single: float32;
  double: float64;
  createdAt: utcDateTime;
  scheduledAt: offsetDateTime;
  birthday: plainDate;
  alarm: plainTime;
  timeout: duration;
  email: Email;
  latitude: Latitude;
}

@doc("Numbers with no JTD equivalent fall back to `string` (with a build warning).")
model WideNumbers {
  big: int64;
  ubig: uint64;
  whole: integer;
  safe: safeint;
  price: decimal;
  precise: decimal128;
}

// ---------------------------------------------------------------------------
// Enums & string-literal unions (both become the JTD `enum` form)
// ---------------------------------------------------------------------------

@doc("ISO 4217 currency code (enum with implicit string values).")
enum Currency {
  USD,
  EUR,
  JPY,
}

@doc("Access level (enum with explicit string values).")
enum Role {
  admin: "admin",
  editor: "editor",
  viewer: "viewer",
}

@doc("Post lifecycle as a string-literal union.")
union PostStatus {
  "draft",
  "published",
  "archived",
}

// ---------------------------------------------------------------------------
// Composition: spread, optional/required, nullable, refs
// ---------------------------------------------------------------------------

@doc("Shared audit fields, mixed in via spread.")
model Timestamps {
  createdAt: utcDateTime;
  updatedAt?: utcDateTime;
}

@doc("A latitude/longitude pair.")
model GeoPoint {
  latitude: Latitude;
  longitude: float64;
}

@doc("A monetary amount.")
model Money {
  amount: float64;
  currency: Currency;
}

@doc("A person who writes posts.")
model Author {
  id: ID;
  name: string;
  email: Email;
  role: Role;
  bio: string | null; // nullable
  website?: url; // optional
  location?: GeoPoint | null; // optional + nullable ref
}

// ---------------------------------------------------------------------------
// Generic template, shown instantiated below as `Page<Comment>`
// ---------------------------------------------------------------------------

@doc("A page of results.")
model Page<T> {
  items: T[];
  nextCursor?: string;
  total: uint32;
}

@doc("A blog comment (spreads Timestamps).")
model Comment {
  ...Timestamps;
  id: ID;
  body: string;
  author: Author;
}

@doc("A blog post: arrays, records, refs, unions, nullable, nested, template.")
model Post {
  ...Timestamps;
  id: ID;
  title: string;
  body: string;
  status: PostStatus;
  tags: string[]; // elements
  authors: Author[]; // elements of ref
  metadata: Record<string>; // values
  prices: Record<Money>; // values of ref
  comments: Page<Comment>; // template instantiation
  featuredComment?: Comment; // optional ref
  coAuthor: Author | null; // nullable ref
}

// ---------------------------------------------------------------------------
// Discriminated types
// ---------------------------------------------------------------------------

@doc("Base notification — @discriminator inheritance becomes a discriminator form.")
@discriminator("kind")
model Notification {
  kind: string;
  sentAt: utcDateTime;
}

@doc("Delivered by email.")
model EmailNotification extends Notification {
  kind: "email";
  to: Email;
  subject: string;
}

@doc("Delivered by SMS.")
model SmsNotification extends Notification {
  kind: "sms";
  to: string;
}

model Cat {
  kind: "cat";
  name: string;
  meow: boolean;
}

model Dog {
  kind: "dog";
  name: string;
  bark: boolean;
}

@doc("@discriminated union with the tag inline (envelope: none).")
@discriminated(#{ envelope: "none" })
union Pet {
  cat: Cat,
  dog: Dog,
}

model OrderCreated {
  orderId: ID;
  total: Money;
}

model OrderShipped {
  orderId: ID;
  trackingNumber: string;
}

@doc("@discriminated union wrapped in an envelope (default: kind + value).")
@discriminated
union OrderEvent {
  created: OrderCreated,
  shipped: OrderShipped,
}

// ---------------------------------------------------------------------------
// Nested namespace (references a type from the parent namespace by name)
// ---------------------------------------------------------------------------

@doc("Geospatial helpers.")
namespace Geo {
  @doc("An axis-aligned bounding box.")
  model BoundingBox {
    topLeft: GeoPoint;
    bottomRight: GeoPoint;
  }
}

// ---------------------------------------------------------------------------
// Constructs JTD silently drops. These compile fine and the data still emits,
// but the decorators/operations below are not reflected in the output — the
// `all` linter ruleset (enabled in tspconfig.yaml) flags each one.
// ---------------------------------------------------------------------------

@doc("Credentials. Constraints and @secret are dropped from JTD output.")
model Credentials {
  @maxLength(120) // dropped -> no-ignored-constraints
  username: string;
  @secret // dropped -> no-ignored-metadata
  apiKey: string;
}

@doc("JTD is data-only, so this operation is not emitted (-> no-operations).")
op healthCheck(): boolean;
