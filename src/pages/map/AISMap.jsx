import Feature from "ol/Feature"
import Map from "ol/Map"
import Overlay from "ol/Overlay"
import View from "ol/View"
import { GeoJSON } from "ol/format"
import LineString from "ol/geom/LineString"
import Point from "ol/geom/Point"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import "ol/ol.css"
import { fromLonLat, Projection } from "ol/proj"
import { XYZ } from "ol/source"
import VectorSource from "ol/source/Vector"
import { Fill, Icon, Stroke, Style, Text } from "ol/style"
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Draw from 'ol/interaction/Draw'
import { toLonLat } from 'ol/proj'
import { zoneService } from "../../services/zone-service"
import WKT from 'ol/format/WKT'
import { useAuth } from "../../hooks/useAuth"
import { toast } from "react-toastify"
import { Button, Card, CardBody, Container, Spinner } from "reactstrap"
import { vesselService } from "../../services/vessel-service"
import { ScaleLine, Zoom, MousePosition } from "ol/control"
import Graticule from "ol/layer/Graticule"
import { createRoot } from "react-dom/client";
import { DeleteOutlined, SettingOutlined } from '@ant-design/icons';

import { tranformApiData } from "../../helpers/common-helper"
import useAisStore from "../../store/useAisStore"
import hoangSa from "./data/HoangSa.json"
import offshore from "./data/Offshore.json"
import truongSa from "./data/TruongSa.json"

const INITIAL_CENTER = [106.81196689833655, 20.728998788877234]
const INITIAL_ZOOM = 7

const MAP_STYLES = {
  boundary: new Style({
    fill: new Fill({ color: "rgba(87, 207, 243, 0.6)" }),
    stroke: new Stroke({ color: "rgba(87, 207, 243, 0.7)", width: 2 })
  }),
  offshore: new Style({
    stroke: new Stroke({ color: "rgba(31, 124, 247, 0.7)", width: 2 })
  })
}

const toDMS = (lat, lon) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "N/A"
  const f = (v, pos, neg) => {
    const a = Math.abs(v), d = Math.floor(a)
    const mNot = (a - d) * 60, m = Math.floor(mNot)
    const s = Math.floor((mNot - m) * 60)
    const dir = v >= 0 ? pos : neg
    return `${d}°${m}'${s}"${dir}`
  }
  return `${f(lat, "N", "S")} / ${f(lon, "E", "W")}`
}

const timeAgo = (pastDate) => {
  const past = new Date(pastDate), now = new Date();
  const diff = Math.floor((now - past) / 1000);
  const m = 60, h = 3600, d = h * 24;
  if (diff < m) return "just now";
  const days = Math.floor(diff / d);
  const hours = Math.floor((diff % d) / h);
  const mins = Math.floor((diff % h) / m);
  let out = "";
  if (days) out += `${days}d `;
  if (hours) out += `${hours}h `;
  if (!days && mins) out += `${mins}m `;
  return (out.trim() || "just now") + " ago";
};

const getMapUrl = (type) => {
  switch (type) {
    case "road":
      return "https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}&hl=vi&gl=VN"
    case "terrain":
      return "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=vi&gl=VN"
    case "satellite":
      return "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=vi&gl=VN"
    default:
      return "https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}&hl=vi&gl=VN"
  }
}

const createVesselFeature = (vessel, isRoute = false) => {
  const lat = Number(vessel.Latitude)
  const lon = Number(vessel.Longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return null // ★ CHANGED

  let color = vessel.ShipTypeColor || "gray"
  const feature = new Feature({
    geometry: new Point(fromLonLat([lon, lat])),
    type: isRoute ? "path" : "vessel",
    data: vessel
  })

  const svgSize = vessel.AidTypeID ? 12 : 24
  const cog = Number(vessel.CourseOverGround)
  const rotation =
    vessel.AidTypeID ? 45 * (Math.PI / 180) : (Number.isFinite(cog) && cog !== 360 ? (cog * Math.PI) / 180 : 0)

  const svg = vessel.AidTypeID
    ? `
    <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${svgSize}" height="${svgSize}" stroke="red" fill="#f3e3e3" stroke-width="2"/>
      <circle cx="${svgSize / 2}" cy="${svgSize / 2}" r="2" fill="red" stroke="red" stroke-width="1"/>
    </svg>
  `
    : `
    <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.437 17.608 3.354 22.828l8.336 -21.536 8.337 21.536L11.944 17.608l-0.253 -0.163 -0.254 0.163Z" stroke="#545D66" stroke-width="0.9" fill="${color.trim()}"></path>
    </svg>
  `
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
  feature.setStyle(
    new Style({
      zIndex: 1000,
      image: new Icon({
        src: svgUrl,
        scale: isRoute ? 0.3 : 0.8,
        imgSize: [svgSize, svgSize],
        rotation
      })
    })
  )
  return feature
}

const createVesselRouteFeature = (point) => {
  const color = point.color || "lime"
  const feature = new Feature({
    geometry: new Point(fromLonLat([point.longitude, point.latitude])),
    type: "pathVessel",
    data: point
  })

  const svgSize = 24
  const svg = `
    <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.437 17.608 3.354 22.828l8.336 -21.536 8.337 21.536L11.944 17.608l-0.253 -0.163 -0.254 0.163Z" stroke="#000" stroke-width="1.5" fill="${color.trim()}"></path>
    </svg>
  `
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
  const rotation = Number.isFinite(point.cog) ? (point.cog * Math.PI) / 180 : 0

  feature.setStyle(
    new Style({
      zIndex: 5000,
      image: new Icon({ src: svgUrl, scale: 0.45, imgSize: [svgSize, svgSize], rotation })
    })
  )
  return feature
}

const createPathFeatures = (points, vessel) => {
  if (!points?.length) return []
  const lineFeature = new Feature({
    geometry: new LineString(points.map((p) => fromLonLat([p.longitude, p.latitude]))),
    type: "path"
  })
  lineFeature.setStyle(new Style({ zIndex: 998, stroke: new Stroke({ color: "#1890ff", width: 3, lineDash: [5, 5] }) })) // ★ CHANGED

  // ★ CHANGED: mỏng dữ liệu (sample theo 72 điểm tối đa)
  const samples =
    points.length > 72
      ? Array.from({ length: 72 }, (_, i) => points[Math.floor((i * (points.length - 1)) / 71)])
      : points

  const pointFeatures = samples.slice(0, -1).map(createVesselRouteFeature)
  const startFeature = createVesselFeature(vessel, true)

  return [lineFeature, ...pointFeatures, startFeature].filter(Boolean)
}



const AISMap = () => {
  document.title = "Bản đồ tàu thuyền"

  const mapRef = useRef()
  const mapInstance = useRef()
  const zonesSource = useMemo(() => new VectorSource(), [])
  const zonesLayerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [viewingRoute, setViewingRoute] = useState(null)
  const [clickPosition, setClickPosition] = useState(null)
  const [drawnCoords, setDrawnCoords] = useState([])
  const [drawnFeature, setDrawnFeature] = useState(null)
  const [mapType, setMapType] = useState(localStorage.getItem("mapType") || "terrain")
  const { user } = useAuth()
  // derive numeric user ID (supports different naming conventions)
  const userId = user?.id ?? user?.ID ?? user?.UserID ?? user?.userId

  const loadZones = useCallback(async () => {
    try {
      if (!userId) return
      zonesSource.clear() // clear existing zones
      const res = await zoneService.searchZones({ UserID: userId, PageSize: 100, PageIndex: 0 }, String(userId))
      // detect array of zones objects
      const arrays = Object.values(res).filter(Array.isArray)
      const list = arrays.find(arr => arr.length && arr[0].hasOwnProperty('Polygon')) || []
      const format = new WKT()
      list.forEach((z) => {
        if (z.Polygon) {
          try {
            // parse WKT in EPSG:4326 and project to map EPSG:3857
            const feature = format.readFeature(z.Polygon, {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:3857'
            })
            zonesSource.addFeature(feature)
          } catch (e) {
            console.error('Failed to parse zone WKT:', e, z.Polygon)
          }
        }
      })
    } catch (e) {
      console.error('Error loading zones on map:', e)
    }
  }, [zonesSource, userId])

  useEffect(() => {
    const handleZonesUpdated = () => loadZones()
    window.addEventListener('zones-updated', handleZonesUpdated)
    return () => window.removeEventListener('zones-updated', handleZonesUpdated)
  }, [loadZones])

  const selectedVessel = useAisStore((s) => s.selectedVessel)
  const setSelectedVessel = useAisStore((s) => s.setSelectedVessel)
  const vesselList = useAisStore((s) => s.vesselList)
  const setVesselList = useAisStore((s) => s.setVesselList)
  const thamSoTau = useAisStore((s) => s.thamSoTau)

  const vectorSource = useMemo(() => new VectorSource(), [])
  const trackSource = useMemo(() => new VectorSource(), []) // ★ CHANGED: nguồn tuyến riêng
  const isDrawingZone = useAisStore(s => s.isDrawingZone)
  const startDrawingZone = useAisStore(s => s.startDrawingZone)
  const stopDrawingZone = useAisStore(s => s.stopDrawingZone)
  const setPolygonCoords = useAisStore(s => s.setPolygonCoords)

  const shipsLayerRef = useRef(null) // để thay đổi base layer URL
  const contextOverlayRef = useRef(null);
  const contextRootRef = useRef(null);
  const contextElRef = useRef(null);
  const popupOverlayRef = useRef(null)   // popup hover track point

  const renderVessels = useCallback(
    (vessels) => {
      vectorSource
        .getFeatures()
        .filter((feature) => ["vessel"].includes(feature.get("type")))
        .forEach((feature) => vectorSource.removeFeature(feature))

      vessels.forEach((vessel) => {
        const vesselFeature = createVesselFeature(tranformApiData(vessel))
        if (vesselFeature) vectorSource.addFeature(vesselFeature)
      })
    },
    [vectorSource]
  )

  const renderPath = useCallback(
    (points, vessel) => {
      vectorSource
        .getFeatures()
        .filter((f) => ["path", "pathVessel"].includes(f.get("type")))
        .forEach((f) => vectorSource.removeFeature(f))

      // thêm path mới
      createPathFeatures(points, vessel).forEach((f) => vectorSource.addFeature(f))
    },
    [vectorSource]
  )

  const getVesselList = useCallback(
    async (thamSoObject = {}) => {
      try {
        const response = await vesselService.getVesselList(thamSoObject)
        const vessels = response?.DM_Tau || []
        setVesselList(vessels)
        renderVessels(vessels)
      } catch (error) {
        console.error("Error fetching vessel list:", error)
        toast.error("Có lỗi xảy ra khi tải danh sách tàu")
      }
    },
    [renderVessels, setVesselList]
  )


  useEffect(() => {
    // handle drawing interaction
    if (!mapInstance.current) return
    let draw
    if (isDrawingZone) {
      draw = new Draw({ source: vectorSource, type: 'Polygon' })
      mapInstance.current.addInteraction(draw)
      draw.on('drawend', (e) => {
        const feat = e.feature
        const coords = feat.getGeometry().getCoordinates()[0]
        const wgsCoords = coords.map((c) => toLonLat(c))
        setDrawnCoords(wgsCoords)
        setDrawnFeature(feat)
        mapInstance.current.removeInteraction(draw)
      })
    }
    return () => {
      if (draw) mapInstance.current.removeInteraction(draw)
    }
  }, [isDrawingZone])

    // re-render vessels when list changes
    useEffect(() => {
      renderVessels(vesselList)
    }, [vesselList, renderVessels])
  // re-render vessels when list changes
  useEffect(() => {
    renderVessels(vesselList)
  }, [vesselList, renderVessels])

  const createTrackForm = (ship) => {
    const lastTime = ship.DateTimeUTC ? new Date(ship.DateTimeUTC).toLocaleString("vi-VN") : "N/A";
  
    return (
      <Card style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: 8 }}>
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", fontWeight: 600 }}>
          {String(ship.VesselName ?? ship.MMSI ?? "").toUpperCase()}
        </div>
        <div style={{ padding: "8px 12px", fontSize: 12 }}>
          <p><b>MMSI:</b> {ship.MMSI ?? ""}</p>
          <p><b>Tốc độ:</b> {ship.SpeedOverGround ?? 0} knots</p>
          <p><b>Hướng:</b> {ship.CourseOverGround ?? 0}°</p>
          <p><b>Vị trí:</b> {toDMS(ship.Latitude, ship.Longitude)}</p>
          <p>
            <b>Thời gian:</b> {lastTime}
            <br />
            {"(" + (ship.DateTimeUTC ? timeAgo(ship.DateTimeUTC) : "N/A") + ")"}
          </p>
          <p><b>Theo dõi hành trình:</b></p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[6, 12, 24, 48, 168, 360].map((h) => (
              <Button key={h} size="sm" color="primary" onClick={() => handleTrackButtonClick(h, ship)}>
                {h === 168 ? "7d" : h === 360 ? "15d" : `${h}h`}
              </Button>
            ))}
            <Button size="sm" color="danger" onClick={() => handleTrackButtonClick(0, ship)}><DeleteOutlined /></Button>
          </div>
        </div>
      </Card>
    );
  };
  

  const getVesselRoute = async (vessel, isAnimate = true, hours = 24) => {
    if (!vessel?.MMSI) return
    try {
      setIsLoading(true)
      const response = await vesselService.getVesselRoute(vessel.MMSI, hours )
      const points = response.map((item) => ({
        longitude: item.longitude,
        latitude: item.latitude,
        vesselName: vessel.VesselName,
        cog: item.courseOverGround,
        sog: item.speedOverGround,
        datetimeutc: item.dateTimeUTC,
        color: vessel.ShipTypeColor
      }))
      if (points.length === 0) {
        setViewingRoute(null)
        return
      }
      console.log(points)
      renderPath(points, vessel)
      setViewingRoute(vessel)

      if (isAnimate && points.length > 0) {
        const startPoint = fromLonLat([points[0].longitude, points[0].latitude])
        const view = mapInstance.current.getView()
        view.setCenter(startPoint)
        view.animate({ zoom: 11, duration: 1200 })
      }
    } catch (e) {
      console.error(e)
      toast.error("Có lỗi xảy ra khi tải hành trình tàu")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTrackButtonClick = useCallback(
    async (durationInHours, ship) => {
      // đóng overlay context (nếu đang mở)
      contextOverlayRef.current?.setPosition(undefined);
  
      // 0 = clear route
      if (durationInHours === 0) {
        setViewingRoute(null);
        vectorSource
          .getFeatures()
          .filter((f) => ["path", "pathVessel"].includes(f.get("type")))
          .forEach((f) => vectorSource.removeFeature(f));
        return;
      }
  
      // gọi API hành trình theo MMSI + giờ (logic sẵn có của bạn)
      await getVesselRoute(ship, true, durationInHours);
    },
    [vectorSource, getVesselRoute]
  );

  useEffect(() => {

    const baseLayer = new TileLayer({
      source: new XYZ({ url: getMapUrl(mapType) }),
      visible: true,
      title: "base"
    })
    shipsLayerRef.current = baseLayer

    const trackLayer = new VectorLayer({
      source: trackSource,
      style: new Style({ stroke: new Stroke({ color: "#1890ff", width: 3, lineDash: [5, 5] }) }),
      zIndex: 5
    })

    const zonesLayer = new VectorLayer({
      source: zonesSource,
      style: new Style({
        fill: new Fill({ color: 'rgba(255,0,0,0.2)' }),
        stroke: new Stroke({ color: 'red', width: 2 })
      }),
      zIndex: 20
    })
    zonesLayerRef.current = zonesLayer
    const map = new Map({
      target: mapRef.current,
      layers: [
        baseLayer,
        new Graticule({
          strokeStyle: new Stroke({ color: "rgba(0,0,0,0.9)", width: 1, lineDash: [0.5, 4] }),
          showLabels: true,
          wrapX: true
        }),
        new VectorLayer({ source: vectorSource, zIndex: 10 }),
        trackLayer // để dành nếu bạn muốn tách route riêng; hiện tại route đang add vào vectorSource
      ],
      view: new View({ center: fromLonLat(INITIAL_CENTER), zoom: INITIAL_ZOOM })
    })

    map.addControl(new ScaleLine())
    map.addControl(new Zoom())
    map.addControl(
      new MousePosition({
        coordinateFormat: (coord) => {
          const lon = Number(coord[0].toFixed(4))
          const lat = Number(coord[1].toFixed(4))
          return toDMS(lat, lon)
        },
        projection: new Projection({ code: "EPSG:4326", units: "degrees", axisOrientation: "neu" }),
        className: "custom-mouse-position",
        target: document.getElementById('mouse-position'),
        undefinedHTML: "&nbsp;"
      })
    )

    // overlay popup hover track point (dùng lại element đã làm)
    const popupElement = document.createElement("div")
    popupElement.className = "ol-popup"
    Object.assign(popupElement.style, {
      backgroundColor: "rgba(0,0,0,0.8)",
      color: "white",
      border: "1px solid white",
      borderRadius: "5px",
      padding: "8px",
      fontSize: "11px"
    })
    const popupOverlay = new Overlay({ element: popupElement, positioning: "bottom-center", stopEvent: false, offset: [0, -10] })
    map.addOverlay(popupOverlay)
    popupOverlayRef.current = popupOverlay

    // overlay context menu (card nút 6h/12h/…)
    const ctxEl = document.createElement("div");
    ctxEl.style.width = "325px";
    contextElRef.current = ctxEl;

    
    // Overlay cho context
    const ctxOverlay = new Overlay({ element: ctxEl, positioning: "center-left", offset: [15, 0] });
    map.addOverlay(ctxOverlay);
    contextOverlayRef.current = ctxOverlay;

    // Gắn React root vào element overlay
    contextRootRef.current = createRoot(ctxEl);

    // Click: mở context menu theo dõi hành trình giống ShipOnMap
    map.on("singleclick", (event) => {
      const feat = map.forEachFeatureAtPixel(
        event.pixel,
        (f) => (f.get("type") === "vessel" ? f : undefined),
        { hitTolerance: 5 }
      );
      if (feat) {
        const v = tranformApiData(feat.get("data"));
        setSelectedVessel(v);
        contextRootRef.current?.render(createTrackForm(v));
        contextOverlayRef.current?.setPosition(event.coordinate);
      
      } else {
        setSelectedVessel(null);
        setClickPosition(null);
        contextOverlayRef.current?.setPosition(undefined);
      }
    })

    // Hover: popup cho point hành trình (pathVessel)
    map.on("pointermove", (event) => {
      if (event.dragging) {
        popupOverlay.setPosition(undefined)
        return
      }
      const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f, { hitTolerance: 5 })
      const type = feature?.get("type")
      map.getTargetElement().style.cursor = type === "pathVessel" || type === "vessel" ? "pointer" : ""
      if (type === "pathVessel") {
        const d = feature.get("data")
        popupElement.innerHTML = `
          <div>
            <strong>Tàu:</strong> ${d.vesselName ?? "N/A"}<br/>
            <strong>Thời gian:</strong> ${d.datetimeutc ? new Date(d.datetimeutc).toLocaleString("vi-VN") : "N/A"}<br/>
            <strong>Vị trí:</strong> ${toDMS(d.latitude, d.longitude)}<br/>
            <strong>Hướng:</strong> ${Number.isFinite(d.cog) ? d.cog + "°" : "N/A"}<br/>
            <strong>Tốc độ:</strong> ${Number.isFinite(d.sog) ? d.sog + " knots" : "N/A"}
          </div>`
        popupOverlay.setPosition(event.coordinate)
      } else {
        popupOverlay.setPosition(undefined)
      }
    })

    mapInstance.current = map

    // thêm vùng ranh giới & offshore
    const geojsonFormat = new GeoJSON()
    const addFeatures = (data, style) => {
      const features = geojsonFormat.readFeatures(data, { featureProjection: "EPSG:3857" })
      features.forEach((f) => f.setStyle(style))
      vectorSource.addFeatures(features)
    }
    addFeatures(hoangSa, MAP_STYLES.boundary)
    addFeatures(truongSa, MAP_STYLES.boundary)
    addFeatures(offshore, MAP_STYLES.offshore)
    // add zone layer
    map.addLayer(zonesLayer)

    // fetch and render saved zones
    loadZones()

    const intervalId = setInterval(() => {
      const current = useAisStore.getState().thamSoTau
      getVesselList(current)
    }, 20000)

    return () => {
      clearInterval(intervalId)
      map.setTarget(undefined)
      try { contextRootRef.current?.unmount(); } catch {}
    }
  }, [vectorSource, trackSource, mapType, getVesselList])

  useEffect(() => {
    localStorage.setItem("mapType", mapType)
    const lyr = shipsLayerRef.current
    if (lyr) {
      const src = lyr.getSource()
      if (src?.setUrl) src.setUrl(getMapUrl(mapType))
    }
  }, [mapType])

  return (
    <React.Fragment>
      {/* Zone draw confirm/cancel */}
      {drawnCoords.length > 0 && (
        <div style={{ position: 'absolute', top: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 1001, display: 'flex', gap: 10 }}>
          <Button color='success' onClick={() => {
            setPolygonCoords(drawnCoords)
            window.dispatchEvent(new CustomEvent('zone-draw-confirmed'))
            if (drawnFeature) {
              vectorSource.removeFeature(drawnFeature)
            }
            stopDrawingZone()
            setDrawnCoords([])
            setDrawnFeature(null)
          }}>
            Xác nhận
          </Button>
          <Button color="danger" onClick={() => { 
            if (drawnFeature) {
              vectorSource.removeFeature(drawnFeature)
            }
            stopDrawingZone(); 
            setDrawnCoords([]); 
            setDrawnFeature(null);
          }}>
            Hủy
          </Button>
        </div>
      )}
      <div className="page-content pb-0">
        <Container fluid className="ms-0 px-0">
          <div style={{ position: "absolute", right: 16, top: 86, zIndex: 1001, display: "flex", gap: 6 }}>
            {[
              { key: "road", text: "Road" },
              { key: "terrain", text: "Terrain" },
              { key: "satellite", text: "Satellite" }
            ].map((m) => (
              <Button
                key={m.key}
                size="sm"
                style={{width:"80px"}}
                color={mapType === m.key ? "primary" : "secondary"}
                onClick={() => setMapType(m.key)}
              >
                {m.text}
              </Button>
            ))}
          </div>
          

          <Card className="mb-0">
            <CardBody style={{ position: "relative", height: "calc(100vh - 75px)", overflow: "hidden" }}>
              <div
                ref={mapRef}
                style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, zIndex: 1 }}
              >
                <div id="mouse-position" style={{ position: 'absolute', bottom: '15px', right: '15px', background: 'rgba(0, 0, 0, 0.5)', color: 'white', padding: '5px', borderRadius: '3px', zIndex: 10, width:'12%', textAlign:'center' }}></div>
              </div>
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  )
}

export default AISMap
