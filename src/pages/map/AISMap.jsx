import React, { useEffect, useRef, useState } from "react";
import { Container } from "reactstrap";
import Feature from "ol/Feature";
import Map from "ol/Map";
import Overlay from "ol/Overlay";
import View from "ol/View";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import hoangSa from "./data/HoangSa.json";
import truongSa from "./data/TruongSa.json";
import offshore from "./data/Offshore.json";
import { GeoJSON } from "ol/format";
import vtTau1 from "./data/Tau1.json";
import vtTau2 from "./data/Tau2.json";
import vtTau3 from "./data/Tau3.json";

const AISMap = () => {
  document.title = "Bản đồ tàu thuyền";

  const mapRef = useRef();
  const overlayRef = useRef();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [vesselInfo, setVesselInfo] = useState("Chưa có thông tin tàu nào được chọn.");

  useEffect(() => {
    const vectorSource = new VectorSource();
    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: vectorSource,
        }),
      ],
      view: new View({
        center: fromLonLat([107.5698, 16.4637]),
        zoom: 6,
      }),
    });

    const infoOverlay = new Overlay({
      element: document.getElementById("mapInfo"),
      positioning: "bottom-center",
      stopEvent: false,
    });
    map.addOverlay(infoOverlay);
    overlayRef.current = infoOverlay;

    const vessels = [
      { name: "Tàu 1", color: "red", points: vtTau1 },
      { name: "Tàu 2", color: "blue", points: vtTau2 },
      { name: "Tàu 3", color: "yellow", points: vtTau3 }
    ];

    vessels.forEach((vessel) => {
      vessel.points.forEach((point) => {
        const feature = new Feature({
          geometry: new Point(fromLonLat([point.longitude, point.latitude])),
          name: vessel.name
        });
        feature.setStyle(new Style({
          image: new CircleStyle({
            radius: 5,
            fill: new Fill({ color: vessel.color }),
            stroke: new Stroke({ color: 'black', width: 1 })
          })
        }));
        vectorSource.addFeature(feature);
      });
    });

    const geojsonFormat = new GeoJSON();
    const featuresHoangSa = geojsonFormat.readFeatures(hoangSa, { featureProjection: "EPSG:3857" });
    const featuresTruongSa = geojsonFormat.readFeatures(truongSa, { featureProjection: "EPSG:3857" });
    const featuresOffshore = geojsonFormat.readFeatures(offshore, { featureProjection: "EPSG:3857" });

    const polygonStyle = new Style({
      fill: new Fill({ color: "rgba(87, 207, 243, 0.6)" }),
      stroke: new Stroke({ color: "rgba(87, 207, 243, 0.7)", width: 2 })
    });

    featuresHoangSa.forEach(f => f.setStyle(polygonStyle));
    featuresTruongSa.forEach(f => f.setStyle(polygonStyle));
    vectorSource.addFeatures(featuresHoangSa);
    vectorSource.addFeatures(featuresTruongSa);
    vectorSource.addFeatures(featuresOffshore);

    const lineStyle = new Style({
      stroke: new Stroke({ color: "rgba(31, 124, 247, 0.7)", width: 2 })
    });

    featuresOffshore.forEach(f => f.setStyle(lineStyle));

    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feat) => feat);
      if (feature) {
        const vesselName = feature.get("name");
 setVesselInfo(`
          <div><strong>Tên tàu :</strong> ${vesselName}</div>
          <div><strong>Destination:</strong> <b>Hải Phòng</b></div>
          <div><strong>Position received:</strong> <b>1 hour ago</b></div>
        `);
        setIsPanelOpen(true);
      } else {
        setVesselInfo("Chưa có thông tin tàu nào được chọn.");
      }
    });

    return () => {
      map.setTarget(undefined);
      overlayRef.current.setPosition(undefined);
    };
  }, []);

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid style={{ 
          position: 'relative', 
          height: '82vh',
          overflow: 'hidden' // Thêm overflow hidden để xử lý các phần tràn ra ngoài
        }}>
          {/* Bản đồ chiếm toàn bộ kích thước */}
          <div 
            ref={mapRef} 
            style={{ 
              width: "100%", 
              height: "100%", 
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1
            }} 
          />
  
          {/* Panel thông tin */}
          <div 
            id="infoPanel" 
            style={{ 
              position: 'absolute',
              right: isPanelOpen ? 0 : '-18%',
              top: 0,
              width: '18%',
              height: '100%',
              padding: "15px",
              backgroundColor: "rgba(249, 249, 249, 0.95)",
              boxShadow: "-2px 0 8px rgba(0, 0, 0, 0.1)",
              transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 2,
              overflowY: 'auto' // Cho phép scroll nội dung dài
            }}
          >
            <h4 style={{ 
              color: "#007bff",
              marginBottom: "15px",
              paddingBottom: "10px",
              borderBottom: "2px solid #007bff"
            }}>
              Thông tin tàu
            </h4>
            <div id="vesselInfo" dangerouslySetInnerHTML={{ __html: vesselInfo }} />
          </div>
  
          {/* Nút điều khiển */}
          <button 
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            style={{
              position: "absolute",
              top: "50%",
              right: isPanelOpen ? 'calc(20% - 20px)' : '20px',
              transform: `translateY(-50%) rotate(${isPanelOpen ? '0deg' : '180deg'})`,
              background: "#007bff",
              border: "none",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#0056b3"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#007bff"}
          >
            <span style={{ 
              color: "white",
              fontSize: "20px",
              transform: "translateX(1px)" // Hiệu chỉnh vị trí mũi tên
            }}>
              ➤
            </span>
          </button>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default AISMap;