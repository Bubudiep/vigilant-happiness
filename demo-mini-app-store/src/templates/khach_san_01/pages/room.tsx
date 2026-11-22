import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate, useParams, useSnackbar } from "zmp-ui";

import { ActionBar, Card, EmptyState, formatPrice, PrimaryButton, Tile, TplHeader, TplPage, useTplTheme } from "../../_shared/kit";
import { StayPicker } from "../components";
import { findRoom, myBookingsAtom, path, stayAtom } from "../data";

export default function RoomPage() {
  const { id } = useParams();
  const room = findRoom(id);
  const navigate = useNavigate();
  const theme = useTplTheme();
  const { openSnackbar } = useSnackbar();
  const stay = useAtomValue(stayAtom);
  const setBookings = useSetAtom(myBookingsAtom);

  if (!room) {
    return (
      <TplPage>
        <TplHeader title="Phòng" />
        <EmptyState emoji="🤔" text="Không tìm thấy phòng" />
      </TplPage>
    );
  }

  const total = room.price * stay.nights;
  const tooMany = stay.guests > room.maxGuests;

  const book = () => {
    setBookings((b) => [
      { id: `h${Date.now()}`, title: room.name, subtitle: `${stay.nights} đêm · ${stay.guests} khách · ${formatPrice(total)}`, date: stay.checkIn, time: "14:00", emoji: room.emoji, status: "upcoming" },
      ...b,
    ]);
    openSnackbar({ text: "Đặt phòng thành công! Mã đặt phòng đã gửi qua Zalo.", type: "success" });
    navigate(path("/bookings"), { replace: true });
  };

  return (
    <TplPage bottomSpace={68}>
      <TplHeader title={room.name} />
      <Tile seed={room.id} emoji={room.emoji} color={room.color} className="h-56 w-full" rounded="" size="text-[96px]" />

      <div className="bg-white p-4">
        <div className="text-xl font-bold">{room.name}</div>
        <div className="mt-1 text-sm text-gray-500">
          {room.size}m² · {room.bed} · View {room.view} · Tối đa {room.maxGuests} khách
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {room.amenities.map((a) => (
            <span key={a} className="rounded-full px-3 py-1 text-xs" style={{ background: `${theme.primary}14`, color: theme.primary }}>
              ✓ {a}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 px-4">
        <Card className="space-y-3">
          <div className="font-semibold">Thời gian lưu trú</div>
          <StayPicker />
          {tooMany && <div className="text-xs text-red-500">Phòng này tối đa {room.maxGuests} khách</div>}
        </Card>
      </div>

      <div className="mt-2 px-4">
        <Card className="space-y-1 text-sm text-gray-600">
          <div className="font-semibold text-gray-900">Chính sách</div>
          <div>• Nhận phòng 14:00 · Trả phòng 12:00</div>
          <div>• Huỷ miễn phí trước 3 ngày</div>
          <div>• Thanh toán tại khách sạn</div>
        </Card>
      </div>

      <ActionBar>
        <div className="flex-1">
          <div className="text-xs text-gray-500">{stay.nights} đêm</div>
          <div className="text-lg font-bold" style={{ color: theme.primary }}>
            {formatPrice(total)}
          </div>
        </div>
        <PrimaryButton onClick={book} disabled={tooMany}>
          Đặt phòng
        </PrimaryButton>
      </ActionBar>
    </TplPage>
  );
}
