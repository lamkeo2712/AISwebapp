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
import { fromLonLat } from "ol/proj"
import { XYZ } from "ol/source"
import VectorSource from "ol/source/Vector"
import { Fill, Icon, Stroke, Style } from "ol/style"
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-toastify"
import { Button, Card, CardBody, Container, ListGroup, ListGroupItem, Spinner } from "reactstrap"
import { vesselService } from "../../services/vessel-service"

// Import map data
import { tranformApiData } from "../../helpers/common-helper"
import useAisStore from "../../store/useAisStore"
import hoangSa from "./data/HoangSa.json"
import offshore from "./data/Offshore.json"
import truongSa from "./data/TruongSa.json"
import Select from "react-select"

// Constants
const INITIAL_CENTER = [106.81196689833655, 20.728998788877234]
const INITIAL_ZOOM = 11

const MAP_STYLES = {
  boundary: new Style({
    fill: new Fill({ color: "rgba(87, 207, 243, 0.6)" }),
    stroke: new Stroke({ color: "rgba(87, 207, 243, 0.7)", width: 2 })
  }),
  offshore: new Style({
    stroke: new Stroke({ color: "rgba(31, 124, 247, 0.7)", width: 2 })
  })
}

const createVesselFeature = (vessel, isRoute = false) => {
  if ((vessel.Latitude === 0 && vessel.Longitude === 0) || (vessel.Latitude == null && vessel.Longitude == null)) {
    //console.log("Vessel has no position")
    return null
  }

  let color = vessel.ShipTypeColor || "gray"
  const feature = new Feature({
    geometry: new Point(fromLonLat([vessel.Longitude, vessel.Latitude])),
    type: isRoute ? "path" : "vessel",
    data: vessel
  })

  const svgSize = vessel.AidTypeID ? 12 : 24
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
      zIndex:1000,
      image: new Icon({
        src: svgUrl,

        scale: isRoute ? 0.3 : 0.8,
        imgSize: [svgSize, svgSize],
        rotation:  vessel.AidTypeID ? 45 * (Math.PI/180) : vessel.CourseOverGround * (Math.PI/180) || 0
      })
    })
  )

  //console.log(vessel.VesselName + ": ", feature)
  return feature
}

const createVesselRouteFeature = (vessel) => {
  let color = vessel.color || "gray"
  const feature = new Feature({
    geometry: new Point(fromLonLat([vessel.longitude, vessel.latitude])),
    type: "pathVessel",
    data: vessel
  })

  const svgSize = 24
  const svg =  `
    <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.437 17.608 3.354 22.828l8.336 -21.536 8.337 21.536L11.944 17.608l-0.253 -0.163 -0.254 0.163Z" stroke="${color.trim()}" stroke-width="0.9" fill="${color.trim()}"></path>
    </svg>
  `
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
  feature.setStyle(
    new Style({
      zIndex:999,
      image: new Icon({
        src: svgUrl,

        scale: 0.4 ,
        imgSize: [svgSize, svgSize],
        rotation:   vessel.cog * (Math.PI/180) || 0
      })
    })
  )
  //console.log(feature)

  return feature
}

const createPathFeatures = (points, vessel) => {
  if (!points?.length) return []
  const lineFeature = new Feature({
    geometry: new LineString(points.map((point) => fromLonLat([point.longitude, point.latitude]))),
    type: "path"
  })

  lineFeature.setStyle(
    new Style({
      zIndex: 998,
      stroke: new Stroke({ color: "#3388ff", width: 2, lineDash: [10, 10] })
    })
  )


  const pointFeatures = points.length > 72
  ? Array.from({ length: 72 }, (_, index) => {
      const position = Math.floor(index * (points.length - 1) / 71)
      return createVesselRouteFeature(points[position])
    })
  : points.map((point, index) => {
      if (index !== points.length - 1) {
        return createVesselRouteFeature(point)
      }
      return null
    }).filter(Boolean)

  // vespath v1
  // const pointFeatures = points.map((point, index) => {
  //   if (index !== points.length - 1) {
  //     return createVesselRouteFeature(point)
  //   }
  //   return null
  // }).filter(Boolean)

  
  const startFeature = createVesselFeature(vessel, true)
  

  //  = new Feature({
  //   geometry: new Point(fromLonLat([points[points.length - 1].longitude, points[points.length - 1].latitude])),
  //   type: "path"
  // })

  // startFeature.setStyle(
  //   new Style({
  //     image: new Icon({
  //       src: `src/assets/images/vessel/ship.png`,
  //       scale: 0.2
  //     })
  //   })
  // )

  return [
    lineFeature,
    ...pointFeatures,
    startFeature
  ]
}

const InfoPanel = memo(
  ({
    isPanelOpen,
    selectedVessel,
    getVesselRoute,
    isLoading,
    setSelectedVessel,
    viewingRoute,
    setViewingRoute,
    renderPath,
    selectedTime,
    setSelectedTime,
    vectorSource 
  }) => (
    <div
      id="infoPanel"
      className="info-panel"
      style={{
        right: isPanelOpen ? 0 : "-24%"
      }}
    >
      <div className="">
        <h4>Thông tin tàu</h4>
        <span
          className="position-absolute fs-24 cursor-pointer"
          onClick={() => setSelectedVessel(null)}
          style={{ top: "5px", right: "20px" }}
        >
          <i className="ri-close-line"></i>
        </span>
      </div>

      {!selectedVessel?.AidTypeID && (
        <>
          <ListGroup>
          <ListGroupItem>
     <b>VesselName: </b> {selectedVessel?.VesselName ?? 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
     <b>MMSI: </b> {selectedVessel?.MMSI ?? 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
     <b>IMO: </b> {selectedVessel?.IMONumber ?? 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
     <b>Call sign: </b> {selectedVessel?.CallSign ?? 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
     <b>ShipType: </b> {selectedVessel?.ShipType ?? 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
              <b>Latitude/Longitude: </b> 
              {selectedVessel?.Latitude !== undefined 
                ? (() => {
                    const latAbs = Math.abs(selectedVessel.Latitude);
                    const latDeg = Math.floor(latAbs);
                    const latMinNotTrunc = (latAbs - latDeg) * 60;
                    const latMin = Math.floor(latMinNotTrunc);
                    const latSec = Math.floor((latMinNotTrunc - latMin) * 60);
                    const latDir = selectedVessel.Latitude >= 0 ? 'N' : 'S';
                    const lonAbs = Math.abs(selectedVessel.Longitude);
                    const lonDeg = Math.floor(lonAbs);
                    const lonMinNotTrunc = (lonAbs - lonDeg) * 60;
                    const lonMin = Math.floor(lonMinNotTrunc);
                    const lonSec = Math.floor((lonMinNotTrunc - lonMin) * 60);
                    const lonDir = selectedVessel.Longitude >= 0 ? 'E' : 'W';
                    return `${latDeg}°${latMin}'${latSec}"${latDir} / ${lonDeg}°${lonMin}'${lonSec}"${lonDir}`;
                  })()
                : 'N/A'}
    </ListGroupItem>
   <ListGroupItem>
     <b>Destination: </b> {selectedVessel?.Destination ?? 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
              <b>DateTimeUTC: </b> 
              {selectedVessel?.DateTimeUTC 
                ? (() => {
                    const date = new Date(selectedVessel.DateTimeUTC);
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
                  })()
                : 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
     <b>RateOfTurn: </b> 
     {selectedVessel?.RateOfTurn ? `${selectedVessel.RateOfTurn}°/min` : 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
     <b>SpeedOverGround: </b> 
     {selectedVessel?.SpeedOverGround ? selectedVessel?.SpeedOverGround == 102.3 ? 'Speed is not available' : `${selectedVessel.SpeedOverGround} knots` : 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
     <b>CourseOverGround: </b> 
     {selectedVessel?.CourseOverGround ? selectedVessel?.CourseOverGround == 360 ? 'Not available' : `${selectedVessel.CourseOverGround}°` : 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
     <b>TrueHeading: </b> 
     {selectedVessel?.TrueHeading ?  (selectedVessel?.TrueHeading == 511 ? 'Not turning' : `${selectedVessel.TrueHeading}°`) : 'N/A'}
   </ListGroupItem>
   <ListGroupItem>
     <b>Dimension: </b> {selectedVessel?.ShipLength ? selectedVessel?.ShipLength + 'm' : "N/A"} x {selectedVessel?.ShipWidth ? selectedVessel?.ShipWidth + 'm' : "N/A"}
   </ListGroupItem>
   
 </ListGroup>
          <div className="text-center d-flex flex-row gap-2 align-items-center mt-3">
            <Select
              options={[
                { value: "1", label: "1H" },
                { value: "3", label: "3H" },
                { value: "6", label: "6H" },
                { value: "12", label: "12H" },
                { value: "24", label: "24H" },
                { value: "48", label: "48H" },
                { value: "72", label: "72H" }
              ]}
              value={selectedTime}
              onChange={(e) => {
                setSelectedTime(e)
              }}
            />
            
            {(viewingRoute && selectedVessel?.MMSI === viewingRoute.MMSI) ? (
              <Button 
              color="primary" 
              onClick={() => {
                setViewingRoute(null);
                // Clear path features when hiding route
                vectorSource
                  .getFeatures()
                  .filter((feature) => feature.get("type") === "path" || feature.get("type") === "pathVessel")
                  .forEach((feature) => vectorSource.removeFeature(feature));
              }} 
              className="flex-grow-1"
            >
              Ẩn hành trình
            </Button>
            )  :
            (
              <Button
              className="d-inline-flex align-items-center justify-content-center"
              color="primary"
              onClick={() => {
                // getVesselRoute(selectedVessel?.MMSI)
                setViewingRoute(selectedVessel)
              }}
              disabled={!selectedVessel?.MMSI || isLoading}
            >
              {isLoading && <Spinner size="sm" className="me-2" />}
              Xem hành trình
            </Button>

            )

            }
          </div>
        </>
      )}
      {!!selectedVessel?.AidTypeID && (
        <>
          <ListGroup>
            <ListGroupItem>
              <b>MMSI: </b> {selectedVessel?.MMSI ?? "N/A"}
            </ListGroupItem>
            <ListGroupItem>
              <b>Type Of Aid To Navigation: </b> {selectedVessel?.AidType ?? "N/A"}
            </ListGroupItem>
            <ListGroupItem>
              <b>Dimension: </b> {selectedVessel?.ShipLength ?? "N/A"}m x {selectedVessel?.ShipWidth ?? "N/A"}m
            </ListGroupItem>
            <ListGroupItem>
              <b>Latitude/Longitude: </b> 
              {selectedVessel?.Latitude !== undefined 
                ? (() => {
                    const latAbs = Math.abs(selectedVessel.Latitude);
                    const latDeg = Math.floor(latAbs);
                    const latMinNotTrunc = (latAbs - latDeg) * 60;
                    const latMin = Math.floor(latMinNotTrunc);
                    const latSec = Math.floor((latMinNotTrunc - latMin) * 60);
                    const latDir = selectedVessel.Latitude >= 0 ? 'N' : 'S';
                    const lonAbs = Math.abs(selectedVessel.Longitude);
                    const lonDeg = Math.floor(lonAbs);
                    const lonMinNotTrunc = (lonAbs - lonDeg) * 60;
                    const lonMin = Math.floor(lonMinNotTrunc);
                    const lonSec = Math.floor((lonMinNotTrunc - lonMin) * 60);
                    const lonDir = selectedVessel.Longitude >= 0 ? 'E' : 'W';
                    return `${latDeg}° ${latMin}' ${latSec}" ${latDir} / ${lonDeg}° ${lonMin}' ${lonSec}" ${lonDir}`;
                  })()
                : 'N/A'}
            </ListGroupItem>
            <ListGroupItem>
              <b>DateTimeUTC: </b> 
              {selectedVessel?.DateTimeUTC 
                ? (() => {
                    const date = new Date(selectedVessel.DateTimeUTC);
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
                  })()
                : 'N/A'}
            </ListGroupItem>
          </ListGroup>
        </>
      )}
    </div>
  )
)

const AISMap = () => {
  document.title = "Bản đồ tàu thuyền"

  const mapRef = useRef()
  const overlayRef = useRef()
  const mapInstance = useRef()
  const [isLoading, setIsLoading] = useState(false)
  const [viewingRoute, setViewingRoute] = useState(null)
  const selectedVessel = useAisStore((state) => state.selectedVessel)
  const setSelectedVessel = useAisStore((state) => state.setSelectedVessel)
  const vesselList = useAisStore((state) => state.vesselList)
  const setVesselList = useAisStore((state) => state.setVesselList)
  const thamSoTau = useAisStore((state) => state.thamSoTau)
  const setThamSoTau  = useAisStore((state) => state.setThamSoTau)
  const vectorSource = useMemo(() => new VectorSource(), [])
  const [selectedTime, setSelectedTime] = useState({ value: "1", label: "1H" })
  const renderVessels = useCallback(
    (vessels) => {
      vectorSource
        .getFeatures()
        .filter((feature) => ["vessel", "path", "pathVessel"].includes(feature.get("type")))
        .forEach((feature) => vectorSource.removeFeature(feature))

        vessels.forEach((vessel) => {
          const vesselFeature = createVesselFeature(tranformApiData(vessel))
          if (vesselFeature !== null) {
            vectorSource.addFeature(vesselFeature)
          }
        })
    },
    [vectorSource]
  )

  const renderPath = useCallback(
    (points, vessel) => {
      vectorSource
        .getFeatures()
        .filter((feature) => feature.get("type") == "path" || feature.get("type") == "pathVessel")
        .forEach((feature) => vectorSource.removeFeature(feature))

      createPathFeatures(points, vessel).forEach((feature) =>{ 
        vectorSource.addFeature(feature)})
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
        if (viewingRoute) {
          // TODO: Sau này sửa bên Config Vessel thì bỏ check
          const vesselExists = vessels.some(vessel => vessel.MMSI === viewingRoute.MMSI)
          if (vesselExists) {
            getVesselRoute(viewingRoute, false)
          } else {
            setViewingRoute(null)
          }
        }
      } catch (error) {
        console.error("Error fetching vessel list:", error)
        toast.error("Có lỗi xảy ra khi tải danh sách tàu")
      }
    },
    [renderVessels, viewingRoute]
  )
  
  // Tách riêng việc lấy route
  useEffect(() => {
    console.log('Viewing Route Changed:', viewingRoute)
    if (viewingRoute) {
      getVesselRoute(viewingRoute, true)
    }
  }, [viewingRoute])

  useEffect(() => {
    renderVessels(vesselList)
  }, [vesselList])

  const getVesselRoute = async (vessel, isAnimate = true) => {
    if (!vessel.MMSI) return
    try {
      setIsLoading(true)
      const response = await vesselService.getVesselRoute({ MMSI: vessel.MMSI, Hours: selectedTime?.value || 24 })
      const points = (response?.DM_HanhTrinh || []).map((item) => ({
        longitude: item.Longitude,
        latitude: item.Latitude,
        vesselName: item.VesselName,
        cog : item.CourseOverGround,
        sog: item.SpeedOverGround,
        datetimeutc: item.DateTimeUTC,
        color: item.ShipTypeColor,
      }))
      if (points.length <= 0) {
        setViewingRoute(null)
        return
      }
      renderPath(points, vessel)
      setViewingRoute(vessel)

      // Zoom lại điểm bắt đầu với hiệu ứng
      if (isAnimate && points.length > 0) {
        const startPoint = fromLonLat([points[0].longitude, points[0].latitude])
        const view = mapInstance.current.getView()
        view.setCenter(startPoint)
        // Thêm hiệu ứng zoom
        view.animate({
          zoom: 11,
          duration: 1500 // Thời gian hiệu ứng zoom
        })
      }
    } catch (error) {
      console.error("Error fetching vessel route:", error)
      toast.error("Có lỗi xảy ra khi tải hành trình tàu")
    } finally {
      setIsLoading(false)
    }
  }

  const popupElement = document.createElement('div')
  popupElement.style.position = 'absolute'
  popupElement.style.backgroundColor = 'black'
  popupElement.style.border = '1px solid white'
  popupElement.style.padding = '10px'
  popupElement.style.zIndex = '1000'
  popupElement.style.display = 'none'
  popupElement.style.fontSize = '10px'
  popupElement.style.color = 'white'
  popupElement.style.width = 'max-content' 
  popupElement.style.maxWidth = '300px' 
  popupElement.style.wordBreak = 'break-word' 


  useEffect(() => {
    const currentThamSoTau = useAisStore.getState().thamSoTau
    console.log("thamSoTau:", currentThamSoTau)
    getVesselList(currentThamSoTau)

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: "http://mt0.google.com/vt/lyrs=p&hl=vi&x={x}&y={y}&z={z}"
          }),
          visible: true,
          title: "ggterrain"
        }),
        new VectorLayer({ source: vectorSource })
      ],
      view: new View({
        center: fromLonLat(INITIAL_CENTER),
        zoom: INITIAL_ZOOM
      })
    })
    mapInstance.current = map

    const infoOverlay = new Overlay({
      element: document.getElementById("mapInfo"),
      positioning: "bottom-center",
      stopEvent: false
    })
    map.addOverlay(infoOverlay)
    overlayRef.current = infoOverlay

    const geojsonFormat = new GeoJSON()
    const addFeatures = (data, style) => {
      const features = geojsonFormat.readFeatures(data, { featureProjection: "EPSG:3857" })
      features.forEach((f) => f.setStyle(style))
      vectorSource.addFeatures(features)
    }

    // Add boundary features
    addFeatures(hoangSa, MAP_STYLES.boundary)
    addFeatures(truongSa, MAP_STYLES.boundary)
    addFeatures(offshore, MAP_STYLES.offshore)

    // Handle vessel click
    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat) => feat)
      if (feature?.get("type") === "vessel") {
        setSelectedVessel(tranformApiData(feature.get("data")))
      }
    })

    
  const popup = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    stopEvent: false,
    offset: [0, -10]
  })
  map.addOverlay(popup)

    map.on("pointermove", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat) => feat)
      if (feature?.get("type") === "pathVessel") {
        const featureData = feature.get("data")
    
        // Cập nhật nội dung popup
        popupElement.innerHTML = `
          <div>
            <strong>Tàu:</strong> ${featureData.vesselName || 'N/A'}<br>
            <strong>Thời gian:</strong> ${featureData.datetimeutc 
                ? (() => {
                    const date = new Date(featureData.datetimeutc);
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
                  })()
                : 'N/A'} <br>
            <strong>Vị trí:</strong> ${(featureData.latitude !== undefined && featureData.longitude !== undefined)
                ? (() => {
                    const latAbs = Math.abs(featureData.latitude);
                    const latDeg = Math.floor(latAbs);
                    const latMinNotTrunc = (latAbs - latDeg) * 60;
                    const latMin = Math.floor(latMinNotTrunc);
                    const latSec = Math.floor((latMinNotTrunc - latMin) * 60);
                    const latDir = featureData.latitude >= 0 ? 'N' : 'S';
                    const lonAbs = Math.abs(featureData.longitude);
                    const lonDeg = Math.floor(lonAbs);
                    const lonMinNotTrunc = (lonAbs - lonDeg) * 60;
                    const lonMin = Math.floor(lonMinNotTrunc);
                    const lonSec = Math.floor((lonMinNotTrunc - lonMin) * 60);
                    const lonDir = featureData.longitude >= 0 ? 'E' : 'W';
                    return `${latDeg}°${latMin}'${latSec}"${latDir} / ${lonDeg}°${lonMin}'${lonSec}"${lonDir}`;
                  })()
                : 'N/A'}<br>
            <strong>Hướng tàu:</strong> ${featureData.cog ? featureData.cog == 360 ? 'Not available' : `${featureData.cog}°` : 'N/A'}<br>
            <strong>Tốc độ:</strong> ${featureData.sog ? featureData.sog == 102.3 ? 'Speed is not available' : `${featureData.sog} knots` : 'N/A'}<br>
          </div>
        `
        
        // Hiển thị popup
        popupElement.style.display = 'block'
        popup.setPosition(event.coordinate)
      } else {
        // Ẩn popup nếu không hover vào feature
        popupElement.style.display = 'none'
        popup.setPosition(undefined)
      }
    })

    const intervalId = setInterval(() => {
      const currentThamSoTau = useAisStore.getState().thamSoTau
      console.log("thamSoTau:", currentThamSoTau)
      getVesselList(currentThamSoTau)
    }, 20000)

    return () => {
      map.setTarget(undefined)
      overlayRef.current?.setPosition(undefined)
      clearInterval(intervalId) // Clean up interval when component unmounts
    }
  }, [vectorSource, getVesselList])

  return (
    <React.Fragment>
      <div className="page-content pb-0">
        <Container fluid className="ms-0 px-0">
          <Card className="mb-0">
            <CardBody style={{ position: "relative", height: "calc(100vh - 75px)", overflow: "hidden" }}>
              <div
                ref={mapRef}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  zIndex: 1
                }}
              ></div>
              <InfoPanel
                renderPath={renderPath}
                isPanelOpen={selectedVessel}
                selectedVessel={selectedVessel}
                getVesselRoute={getVesselRoute}
                isLoading={isLoading}
                setSelectedVessel={setSelectedVessel}
                viewingRoute={viewingRoute}
                setViewingRoute={setViewingRoute}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                vectorSource={vectorSource}
              />
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  )
}

export default AISMap
