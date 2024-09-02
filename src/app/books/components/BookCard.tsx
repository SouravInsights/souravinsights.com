import React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Book } from "../types/bookTypes";

interface BookCardProps {
  book: Book;
}

export const BookCard: React.FC<BookCardProps> = ({ book }) => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <CardTitle className="text-lg">{book.title}</CardTitle>
      <CardDescription>
        {book.authors.map((a) => a.name).join(", ")}
      </CardDescription>
    </CardHeader>
    <CardContent className="flex-grow relative h-48">
      <Image
        src={book.cover}
        alt={book.title}
        layout="fill"
        objectFit="cover"
        className="rounded-md"
      />
    </CardContent>
    <CardFooter>
      <p className="text-sm text-gray-500">{book.status}</p>
    </CardFooter>
  </Card>
);
