"use client";

import type { ReactNode } from "react";
import { getLocation } from "@/lib/fixtures";

type DeliveryMapAlternativePin = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type DeliveryMapSurfaceProps = {
  title: string;
  summary: string;
  serviceLabel: string;
  typedAddress: string;
  normalizedAddress: string | null;
  confirmedDropoffLabel: string | null;
  confirmedDropoffSourceLabel: string;
  addressConfidenceLabel: string;
  etaLabel: string | null;
  currentLocationId: string | null;
  currentLocationLabel: string;
  futureLocationId?: string | null;
  futureLocationLabel?: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  decisionLabel?: string | null;
  footerNote?: string | null;
  alternativePins?: DeliveryMapAlternativePin[];
  liveCanvas?: ReactNode;
  serviceNarrative?: string | null;
};

const mapBounds = {
  minLng: 37.16,
  maxLng: 37.66,
  minLat: 55.61,
  maxLat: 55.8,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function projectPoint(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) {
    return { x: 82, y: 18 };
  }

  const xRatio = (lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng);
  const yRatio = (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat);

  return {
    x: clamp(10 + xRatio * 76, 10, 90),
    y: clamp(86 - yRatio * 68, 16, 86),
  };
}

function getLocationAnchor(locationId: string | null | undefined) {
  const location = getLocation(locationId ?? null);

  if (!location) {
    return { x: 18, y: 34 };
  }

  return projectPoint(location.lat, location.lng);
}

function buildRoutePath(start: { x: number; y: number }, end: { x: number; y: number }) {
  const controlX = (start.x + end.x) / 2;
  const controlY = Math.min(start.y, end.y) - 14;

  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
}

function renderFallbackCanvas(input: {
  origin: { x: number; y: number };
  future: { x: number; y: number };
  destination: { x: number; y: number };
  futureLocationId?: string | null;
  futureLocationLabel?: string | null;
  currentLocationLabel: string;
  confirmedDropoffLabel: string | null;
  alternativePins: DeliveryMapAlternativePin[];
  etaBubble: { x: number; y: number };
  etaLabel: string | null;
}) {
  return (
    <div className="delivery-map-canvas">
      <div className="delivery-map-canvas__terrain" />
      <svg
        className="delivery-map-canvas__svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.16)" />
            <stop offset="100%" stopColor="rgba(181, 109, 51, 0.9)" />
          </linearGradient>
        </defs>
        <path
          d={buildRoutePath(input.origin, input.destination)}
          className="delivery-map-canvas__route"
        />
        {input.futureLocationId ? (
          <path
            d={buildRoutePath(input.future, input.destination)}
            className="delivery-map-canvas__route delivery-map-canvas__route--future"
          />
        ) : null}
      </svg>

      <div
        className="delivery-map-pin delivery-map-pin--origin"
        style={{ left: `${input.origin.x}%`, top: `${input.origin.y}%` }}
      >
        <span className="delivery-map-pin__dot" />
        <small>Кухня</small>
        <strong>{input.currentLocationLabel}</strong>
      </div>

      {input.futureLocationId && input.futureLocationLabel ? (
        <div
          className="delivery-map-pin delivery-map-pin--future"
          style={{ left: `${input.future.x}%`, top: `${input.future.y}%` }}
        >
          <span className="delivery-map-pin__dot" />
          <small>Потом</small>
          <strong>{input.futureLocationLabel}</strong>
        </div>
      ) : null}

      <div
        className="delivery-map-pin delivery-map-pin--dropoff"
        style={{ left: `${input.destination.x}%`, top: `${input.destination.y}%` }}
      >
        <span className="delivery-map-pin__dot" />
        <small>Точка вручения</small>
        <strong>{input.confirmedDropoffLabel ?? "Точку ещё уточняем"}</strong>
      </div>

      {input.alternativePins.map((pin) => {
        const point = projectPoint(pin.lat, pin.lng);

        return (
          <div
            className="delivery-map-pin delivery-map-pin--alternative"
            key={pin.id}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <span className="delivery-map-pin__dot" />
            <small>Вариант</small>
            <strong>{pin.label}</strong>
          </div>
        );
      })}

      <div
        className="delivery-map-bubble"
        style={{ left: `${input.etaBubble.x}%`, top: `${input.etaBubble.y}%` }}
      >
        <span>{input.etaLabel ?? "Уточняем время"}</span>
      </div>
    </div>
  );
}

export function DeliveryMapSurface({
  title,
  summary,
  serviceLabel,
  typedAddress,
  normalizedAddress,
  confirmedDropoffLabel,
  confirmedDropoffSourceLabel,
  addressConfidenceLabel,
  etaLabel,
  currentLocationId,
  currentLocationLabel,
  futureLocationId,
  futureLocationLabel,
  destinationLat,
  destinationLng,
  decisionLabel,
  footerNote,
  alternativePins = [],
  liveCanvas,
  serviceNarrative,
}: DeliveryMapSurfaceProps) {
  const origin = getLocationAnchor(currentLocationId);
  const future = getLocationAnchor(futureLocationId);
  const destination = projectPoint(destinationLat, destinationLng);
  const etaBubble = {
    x: clamp((origin.x + destination.x) / 2 + 4, 18, 82),
    y: clamp((origin.y + destination.y) / 2 - 10, 12, 80),
  };

  return (
    <article className="delivery-map-card">
      <div className="delivery-map-card__head">
        <div>
          <span className="section-title">Карта сервиса</span>
          <h3>{title}</h3>
          <p>{summary}</p>
        </div>
        {decisionLabel ? <span className="pill pill--accent">{decisionLabel}</span> : null}
      </div>

      <div className="delivery-map-card__layout">
        {liveCanvas ? (
          <div className="delivery-map-canvas delivery-map-canvas--live">{liveCanvas}</div>
        ) : (
          renderFallbackCanvas({
            origin,
            future,
            destination,
            futureLocationId,
            futureLocationLabel,
            currentLocationLabel,
            confirmedDropoffLabel,
            alternativePins,
            etaBubble,
            etaLabel,
          })
        )}

        <div className="delivery-map-card__meta">
          <div className="delivery-map-contract">
            <span className="section-title">Что уже подтверждено</span>
            <strong>{etaLabel ?? "Уточняем время"}</strong>
            <p>До каталога подтверждаем адрес, точку вручения и обещание по времени.</p>
            <div className="delivery-map-contract__chips">
              <span className="chip chip--ghost">Кухня: {currentLocationLabel}</span>
              <span className="chip chip--ghost">
                Вручение: {confirmedDropoffLabel ?? "точку ещё уточняем"}
              </span>
              <span className="chip chip--ghost">Точность: {addressConfidenceLabel}</span>
            </div>
          </div>

          <div className="feature-grid delivery-map-feature-grid">
            <div className="feature-tile">
              <span>Адрес</span>
              <strong>{typedAddress}</strong>
              <small>{normalizedAddress ?? "Уточним вручную, если адрес читается неуверенно"}</small>
            </div>
            <div className="feature-tile">
              <span>Время</span>
              <strong>{etaLabel ?? "Уточняем"}</strong>
              <small>{serviceLabel}</small>
            </div>
            <div className="feature-tile">
              <span>Подтверждение</span>
              <strong>{addressConfidenceLabel}</strong>
              <small>{confirmedDropoffSourceLabel}</small>
            </div>
            <div className="feature-tile">
              <span>Кухня сейчас</span>
              <strong>{currentLocationLabel}</strong>
              <small>Каталог открываем уже под этой точкой.</small>
            </div>
          </div>

          {serviceNarrative ? (
            <div className="delivery-map-narrative">
              <span className="section-title">Для гостя</span>
              <p>{serviceNarrative}</p>
            </div>
          ) : null}

          {footerNote ? <p className="kicker">{footerNote}</p> : null}
        </div>
      </div>
    </article>
  );
}
