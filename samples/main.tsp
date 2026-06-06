@doc("A blog post.")
model Post {
  id: string;
  title: string;
  tags: string[];
  status: "draft" | "published";
  author: Author;
  comments?: Record<Comment>;
}

@doc("A person who writes posts.")
model Author {
  name: string;
  age?: uint8;
}

model Comment {
  body: string;
  createdAt: utcDateTime;
}

@discriminator("kind")
model Notification {
  kind: string;
}
model EmailNotification extends Notification {
  kind: "email";
  address: string;
}
model SmsNotification extends Notification {
  kind: "sms";
  phone: string;
}
