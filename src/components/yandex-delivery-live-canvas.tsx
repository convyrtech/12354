"use client";

type AlternativePin = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type LivePinPreview = {
  lat: number;
  lng: number;
  resolvedAddress: string | null;
};

type YandexDeliveryLiveCanvasProps = {
  currentLocationId: string | null;
  futureLocationId?: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  destinationLabel?: string | null;
  alternativePins?: AlternativePin[];
  onDestinationPreview?: (preview: LivePinPreview | null) => void;
  className?: string;
};

export function YandexDeliveryLiveCanvas({
  className,
  destinationLabel,
  alternativePins = [],
}: YandexDeliveryLiveCanvasProps) {
  return (
    <div className={className}>
      <div className="yandex-canvas-placeholder">
        <strong>Карта доставки</strong>
        <span>{destinationLabel ?? "Точку вручения уточним на карте после подключения API."}</span>
        {alternativePins.length > 0 ? (
          <small>{`Альтернативных точек: ${alternativePins.length}`}</small>
        ) : null}
      </div>
    </div>
  );
}
