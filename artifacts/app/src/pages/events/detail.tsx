import { useGetEvent, useApplyToEvent, useCancelApplication, getGetEventQueryKey, getListEventsQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Clock, Coins, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EventDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { data: event, isLoading } = useGetEvent(id, { query: { enabled: !!id, queryKey: getGetEventQueryKey(id) } });
  
  const queryClient = useQueryClient();
  const applyMutation = useApplyToEvent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      }
    }
  });

  const cancelMutation = useCancelApplication({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      }
    }
  });

  if (isLoading) return <MobileLayout><div className="p-4">Loading...</div></MobileLayout>;
  if (!event) return <MobileLayout><div className="p-4">Not found</div></MobileLayout>;

  return (
    <MobileLayout>
      <div className="p-4">
        <Link href="/events" className="inline-flex items-center text-sm text-muted-foreground mb-4">
          <ChevronLeft size={16} /> 戻る
        </Link>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-20">
          <div className="flex gap-2 flex-wrap mb-3">
            {event.tags.map(tag => (
              <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="text-2xl font-serif font-bold mb-2">{event.theme}</h1>
          {event.subTheme && <p className="text-muted-foreground mb-6">{event.subTheme}</p>}

          <div className="flex gap-2 mb-6">
            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">6人以内</span>
            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">2時間以内</span>
            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">5000円以内</span>
          </div>

          <div className="space-y-4 text-sm mb-8">
            <div className="flex gap-3">
              <Calendar size={18} className="text-muted-foreground" />
              <div>
                <p className="font-medium">日時</p>
                <p className="text-muted-foreground">{format(new Date(event.dateStart), 'yyyy/MM/dd HH:mm')} - {format(new Date(event.dateEnd), 'HH:mm')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin size={18} className="text-muted-foreground" />
              <div>
                <p className="font-medium">場所</p>
                <p className="text-muted-foreground">{event.location}</p>
                {event.locationUrl && (
                  <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block mt-1">地図を見る</a>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Coins size={18} className="text-muted-foreground" />
              <div>
                <p className="font-medium">参加費</p>
                <p className="text-muted-foreground">¥{event.fee.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Users size={18} className="text-muted-foreground" />
              <div>
                <p className="font-medium">参加状況 ({event.applicantsCount}/{event.capacity})</p>
                <div className="flex gap-1.5 mt-2">
                  {Array.from({ length: event.capacity }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-3 h-3 rounded-full ${i < event.applicantsCount ? 'bg-primary' : 'bg-muted border border-border'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground">
                {event.hostName.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">主催者</p>
                <p className="text-sm font-medium">{event.hostName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom action area */}
        <div className="fixed bottom-[64px] left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border flex justify-center z-10">
          <div className="w-full max-w-[430px]">
            {event.isApplied ? (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => cancelMutation.mutate({ id })}
                  disabled={cancelMutation.isPending}
                >
                  キャンセルする
                </Button>
                <p className="text-xs text-center text-muted-foreground">参加登録済みです</p>
              </div>
            ) : event.remainingSeats > 0 ? (
              <Button 
                className="w-full"
                onClick={() => applyMutation.mutate({ id })}
                disabled={applyMutation.isPending}
              >
                申し込む (先着)
              </Button>
            ) : (
              <Button disabled className="w-full">
                満席です
              </Button>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
