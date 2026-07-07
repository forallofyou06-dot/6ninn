import { useListEvents, getListEventsQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { format } from "date-fns";
import { Link } from "wouter";
import { Calendar, MapPin, Users } from "lucide-react";

export default function EventsList() {
  const { data: events, isLoading } = useListEvents({ status: 'open' });

  return (
    <MobileLayout>
      <div className="p-4">
        <h1 className="text-xl font-serif font-bold mb-4">募集中の会</h1>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-muted h-32 rounded-xl" />
            ))}
          </div>
        ) : events?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>募集中の会がありません。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events?.map(event => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex gap-2 flex-wrap mb-2">
                    {event.tags.map(tag => (
                      <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-lg font-bold mb-1">{event.theme}</h2>
                  {event.subTheme && <p className="text-sm text-muted-foreground mb-3">{event.subTheme}</p>}
                  
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{format(new Date(event.dateStart), 'MM/dd HH:mm')} - {format(new Date(event.dateEnd), 'HH:mm')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-2">
                        <Users size={14} />
                        <div className="flex gap-1">
                          {Array.from({ length: event.capacity }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2 h-2 rounded-full ${i < event.applicantsCount ? 'bg-primary' : 'bg-muted border border-border'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="font-medium text-foreground">¥{event.fee.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
