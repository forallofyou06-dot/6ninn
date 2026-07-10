import { Redirect, useParams } from "wouter";
export default function EventReport() {
  const params = useParams();
  return <Redirect to={`/events/${params.id}`} />;
}
