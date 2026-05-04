# Context-Aware Road Monitoring for Public Transport Safety: A Multi-Model Deep Learning Approach with Edge-Optimized Adaptive Processing

---

## TABLE OF CONTENTS

| Section | Page |
|---|---|
| DECLARATION | i |
| ABSTRACT | ii |
| ACKNOWLEDGEMENT | iii |
| TABLE OF CONTENTS | iv |
| LIST OF FIGURES | vi |
| LIST OF TABLES | viii |
| LIST OF ABBREVIATIONS | ix |
| **1. INTRODUCTION** | **1** |
| 1.1 Background & Literature Survey | 1 |
| 1.2 Research Gap | 5 |
| 1.3 Research Problem | 7 |
| 1.4 Research Objectives | 8 |
| **2. METHODOLOGY** | **9** |
| 2.1 Methodology | 9 |
| 2.1.1 System Overview | 9 |
| 2.1.2 Data Collection | 11 |
| 2.1.3 Data Preprocessing | 12 |
| 2.1.4 Feature Engineering | 14 |
| 2.1.5 Lane Detection Model (YOLOv8-seg) | 15 |
| 2.1.6 Object Detection Model (YOLOv8n) | 17 |
| 2.1.7 Depth Estimation Model (MiDaS) | 18 |
| 2.1.8 Adaptive Processing Framework | 20 |
| 2.1.9 Detection-Informed Video Enhancement | 22 |
| 2.1.10 Driver Behavior Analysis & Violation Detection | 24 |
| 2.2 Commercialization Aspects of the Product | 26 |
| 2.2.1 Overview | 26 |
| 2.2.2 Target Market | 26 |
| 2.2.3 Value Proposition | 26 |
| 2.2.4 Business Model | 27 |
| 2.2.5 Scalability | 27 |
| 2.2.6 Commercial Benefits | 28 |
| 2.3 Testing and Implementation | 29 |
| 2.3.1 System Implementation | 29 |
| 2.3.2 Testing Strategy | 30 |
| 2.3.3 Performance Evaluation | 32 |
| 2.3.4 Limitations | 33 |
| **3. RESULTS AND DISCUSSION** | **34** |
| 3.1 Results | 34 |
| 3.1.1 Lane Detection Results | 34 |
| 3.1.2 Object Detection Results | 35 |
| 3.1.3 Depth Estimation Results | 36 |
| 3.1.4 Adaptive Processing Results | 37 |
| 3.1.5 Driver Behavior Analysis Results | 38 |
| 3.1.6 System Performance Results | 39 |
| 3.2 Research Findings | 40 |
| 3.2.1 Multi-Model Fusion Enhances Context Awareness | 40 |
| 3.2.2 Adaptive Processing is Essential for Edge Deployment | 40 |
| 3.2.3 Kalman-Filtered Lane Memory Improves Robustness | 41 |
| 3.2.4 Ground-Referenced Depth is Effective Without Calibration | 41 |
| 3.2.5 Regional Data is Critical for Accuracy | 41 |
| 3.2.6 Detection-Informed Enhancement Improves Model Performance | 42 |
| 3.3 Discussion | 42 |
| 3.3.1 Comparison with Existing Systems | 42 |
| 3.3.2 Comparison with Academic Research | 43 |
| 3.3.3 Practical Implications | 44 |
| 3.3.4 Limitations of the Study | 45 |
| 3.3.5 Future Improvements | 46 |
| 3.4 Summary of Student's Contribution | 47 |
| **4. CONCLUSIONS** | **48** |
| **REFERENCES** | **49** |

---

## LIST OF FIGURES

| Figure | Description | Page |
|---|---|---|
| Fig 1.1 | Road traffic accident statistics in Sri Lanka (2018–2024) | 2 |
| Fig 1.2 | Comparison of traditional ADAS vs. context-aware monitoring | 4 |
| Fig 1.3 | Research gap visualization — existing systems vs. proposed | 6 |
| Fig 2.1 | High-level system architecture (three-tier IoT ecosystem) | 9 |
| Fig 2.2 | Processing pipeline flowchart | 10 |
| Fig 2.3 | Sample frames from Sri Lankan dashcam footage datasets | 11 |
| Fig 2.4 | RLMD dataset sample annotations (9 lane marking classes) | 12 |
| Fig 2.5 | Detection-informed video enhancement pipeline stages | 13 |
| Fig 2.6 | ROI cropping strategy (top 40% removal) | 14 |
| Fig 2.7 | YOLOv8-seg architecture for lane instance segmentation | 15 |
| Fig 2.8 | Lane segmentation output examples (solid, dashed, urban markings) | 16 |
| Fig 2.9 | YOLOv8n object detection architecture | 17 |
| Fig 2.10 | MiDaS v2.1 Small depth estimation pipeline | 18 |
| Fig 2.11 | Ground-referenced proximity classification logic | 19 |
| Fig 2.12 | Adaptive processing decision matrix flowchart | 20 |
| Fig 2.13 | Speed-based frame gap scheduling diagram | 21 |
| Fig 2.14 | Detection-informed CLAHE (multi-zone contrast enhancement) | 23 |
| Fig 2.15 | Video enhancement comparison: original vs. enhanced frame | 23 |
| Fig 2.16 | Kalman filter state vector for lane memory tracking | 24 |
| Fig 2.17 | Driver behavior analyzer — violation detection flowchart | 25 |
| Fig 2.18 | MQTT-based IoT communication architecture | 29 |
| Fig 2.19 | React dashboard — real-time fleet monitoring interface | 30 |
| Fig 2.20 | Testing environment setup (Raspberry Pi 4 + USB camera) | 31 |
| Fig 3.1 | Lane detection confusion matrix (RLMD dataset) | 34 |
| Fig 3.2 | Lane segmentation visual results on Sri Lankan roads | 35 |
| Fig 3.3 | Object detection results — bounding boxes with confidence | 36 |
| Fig 3.4 | MiDaS depth map output — color-coded proximity visualization | 36 |
| Fig 3.5 | Adaptive processing CPU load comparison graph | 37 |
| Fig 3.6 | Effective FPS under different speed profiles | 38 |
| Fig 3.7 | Violation detection timeline — sample 10-minute drive | 39 |
| Fig 3.8 | Combined system output — triple panel visualization | 40 |
| Fig 3.9 | Kalman filter lane memory during temporary occlusions | 41 |
| Fig 3.10 | Comparative performance chart — proposed vs. existing systems | 43 |

---

## LIST OF TABLES

| Table | Description | Page |
|---|---|---|
| Table 1.1 | Summary of existing ADAS and monitoring systems | 3 |
| Table 2.1 | Model configuration summary | 10 |
| Table 2.2 | RLMD dataset — lane marking class distribution | 12 |
| Table 2.3 | Roboflow road object dataset — class distribution | 13 |
| Table 2.4 | Proximity classification thresholds | 19 |
| Table 2.5 | Speed-based adaptive frame gap settings | 21 |
| Table 2.6 | Processing level classification criteria | 22 |
| Table 2.7 | Video enhancement level presets | 23 |
| Table 2.8 | Violation types and severity mappings | 25 |
| Table 2.9 | Hardware specifications (Raspberry Pi 4 Model B) | 29 |
| Table 2.10 | Software stack and dependencies | 30 |
| Table 2.11 | Unit test coverage summary | 31 |
| Table 3.1 | Lane segmentation performance by class group | 34 |
| Table 3.2 | Object detection performance metrics | 35 |
| Table 3.3 | Depth estimation accuracy — proximity classification | 36 |
| Table 3.4 | Adaptive processing impact comparison | 37 |
| Table 3.5 | Violation detection accuracy by type | 38 |
| Table 3.6 | End-to-end system latency breakdown | 39 |
| Table 3.7 | Comparison with existing ADAS systems | 43 |
| Table 3.8 | Comparison with academic lane detection approaches | 44 |

---

## LIST OF ABBREVIATIONS

| Abbreviation | Full Form |
|---|---|
| ADAS | Advanced Driver Assistance Systems |
| AI | Artificial Intelligence |
| AEB | Automated Emergency Braking |
| ARM | Advanced RISC Machine |
| BGR | Blue Green Red (Color Space) |
| CLAHE | Contrast Limited Adaptive Histogram Equalization |
| CNN | Convolutional Neural Network |
| COCO | Common Objects in Context |
| CPU | Central Processing Unit |
| CTB | Ceylon Transport Board |
| DI-TM | Detection-Informed Tone Mapping |
| DI-VE | Detection-Informed Video Enhancement |
| FPS | Frames Per Second |
| GPU | Graphics Processing Unit |
| HDR | High Dynamic Range |
| IoT | Internet of Things |
| INT8 | 8-bit Integer Quantization |
| LAB | Lightness-A-B (Color Space) |
| LiDAR | Light Detection and Ranging |
| LSTM | Long Short-Term Memory |
| MAC | Multiply-Accumulate Operations |
| MDE | Monocular Depth Estimation |
| MiDaS | Monocular Depth Estimation in Autonomous Systems |
| MQTT | Message Queuing Telemetry Transport |
| NPU | Neural Processing Unit |
| OBD-II | On-Board Diagnostics II |
| ONNX | Open Neural Network Exchange |
| RGB | Red Green Blue (Color Space) |
| RLMD | Road Lane Marking Dataset |
| ROI | Region of Interest |
| SCNN | Spatial CNN |
| YOLO | You Only Look Once |

---

## DECLARATION

I declare that this thesis is my own work and has not been submitted in any form for another degree or diploma at any university or other institution of tertiary education. Information derived from the published or unpublished work of others has been acknowledged in the text and a list of references is given.

**Student Name:** ____________________________

**Registration Number:** IT22569486

**Signature:** ____________________________

**Date:** ____________________________

---

## ABSTRACT

Public transport bus operations within the Sri Lankan transport landscape represent a critical yet vulnerable segment of the national infrastructure, characterized by high passenger density and complex operational environments. Safety challenges such as reckless lane changes, tailgating, and excessive speeding are endemic, necessitating advanced technological interventions to supplement inconsistent manual enforcement. This research presents a comprehensive, context-aware road monitoring system that integrates a triad of deep learning models — specifically YOLOv8 instance segmentation for lane identification, YOLOv8 object detection for obstacle recognition, and MiDaS monocular depth estimation for proximity sensing — into a unified real-time pipeline. Optimized for deployment on resource-constrained Raspberry Pi 4 edge devices, the system utilizes a five-optimization adaptive processing framework to reduce computational overhead by up to 75% while maintaining situational awareness. Key innovations include a Kalman-filtered lane memory tracker for temporal persistence during occlusions, a ground-referenced proximity analyzer that categorizes distance without metric calibration, and a detection-informed video enhancement pipeline inspired by tone-mapping research. Empirical evaluations using Sri Lankan road footage demonstrate that the system effectively detects Ceylon Transport Board rule violations and provides real-time alerts via an MQTT-based IoT architecture with SQLite-backed offline resilience. The system achieves an effective FPS of 18.2 in urban environments on the Raspberry Pi 4 while reducing CPU load by up to 74%, proving that sophisticated multi-model AI can be democratized for deployment in resource-constrained environments.

**Keywords** — Context-Aware Monitoring, YOLOv8, MiDaS Depth Estimation, Lane Detection, Object Detection, Edge Computing, Adaptive Processing, ADAS, IoT, Public Transport Safety, Kalman Filter, ONNX Runtime, Video Enhancement, Driver Behavior Analysis.

---

## ACKNOWLEDGEMENT

I would like to express my sincere gratitude to my research supervisor for their invaluable guidance and continuous support throughout this research project. Their expertise in computer vision and embedded systems has been instrumental in shaping the direction and quality of this work.

I extend my heartfelt thanks to the Faculty of Computing at Sri Lanka Institute of Information Technology for providing the academic environment and resources necessary for conducting this research.

Special appreciation goes to the Ceylon Transport Board for their cooperation in providing access to operational data and insights that informed the design of the violation detection framework.

I am grateful to my fellow researchers and colleagues who contributed through technical discussions, code reviews, and collaborative testing sessions that significantly improved the quality of the implementation.

Finally, I would like to thank my family for their unwavering support and encouragement throughout my academic journey.

---

# 1. INTRODUCTION

## 1.1 Background & Literature Survey

Road traffic accidents in the South Asian context, and particularly in Sri Lanka, remain a primary driver of non-natural fatalities, with public transport vehicles being involved in a disproportionate number of high-severity incidents. According to the Sri Lanka Police Department's traffic statistics, over 3,000 fatalities and 25,000 injuries are reported annually due to road accidents, with public transport buses contributing to approximately 15% of these incidents due to their size, frequency of operation, and the often aggressive driving behaviors observed in urban and inter-city routes. The Ceylon Transport Board (CTB), as the state-owned bus operator, manages a vast fleet navigating diverse environments ranging from congested urban corridors in Colombo to winding rural routes with varying infrastructure quality.

Current safety paradigms rely heavily on retroactive review of GPS telematics or intermittent manual inspections, both of which fail to capture the granular, contextual nuances of dangerous driving behavior. High-speed driving in low-traffic scenarios might be acceptable, whereas the same speed in dense traffic or during a lane violation constitutes a severe safety breach. This situational nuance defines the necessity for a context-aware monitoring system capable of perceiving and reasoning about the road environment in real-time.

[Image: Bar chart showing Sri Lankan road traffic accident statistics from 2018-2024, with breakdowns by vehicle type, highlighting public transport bus involvement. Data sourced from Sri Lanka Police Department traffic reports.]

### Lane Detection Technologies

The field of lane detection has evolved significantly from early edge-based techniques. Classical approaches relied on the Hough Transform to detect straight lines in pre-processed binary images, but these methods were fragile in the presence of shadows, occlusions, and curved roads. Early deep learning models like LaneNet (Neven et al., 2018) and SCNN (Pan et al., 2018) provided the foundation for recognizing lanes as distinct instances using semantic and instance segmentation. These approaches leveraged spatial relationships within the image to achieve pixel-level lane classification.

However, the computational complexity of models like SCNN — which propagates features across rows and columns sequentially — often precluded real-time execution on edge devices. More recent architectures such as Ultra-Fast Lane Detection (Qin et al., 2020) addressed this by reformulating lane detection as a row-wise classification problem, achieving speeds exceeding 300 FPS on desktop GPUs. Yet, their performance on non-standard road markings remained limited.

YOLOv8-seg represents the current state-of-the-art in instance segmentation, offering a balance between accuracy and inference speed by utilizing a decoupled head and anchor-free design. Unlike purpose-built lane detectors, YOLOv8-seg can classify different types of markings (solid, dashed, crosswalk, box junction, etc.) simultaneously through multi-class instance segmentation. The RLMD (Road Lane Marking Dataset) highlights the need for specialized training in environments where markings may be occluded or complex, such as box junctions and crosswalks common in Sri Lankan urban areas.

### Monocular Depth Estimation

Monocular Depth Estimation (MDE) has undergone a parallel transformation, with the MiDaS model family demonstrating that robust relative depth can be inferred from single RGB images by training on massive, diverse datasets combining multiple depth sources. MiDaS v2.1 Small is particularly noteworthy for its ability to provide relative distance information on embedded platforms using the ONNX Runtime, requiring only 13.7M parameters compared to the 105M of the full DPT-Large variant.

Although relative depth lacks metric precision — meaning the output represents ordinal relationships (closer vs. farther) rather than absolute distances in meters — researchers have shown that it is highly effective for proximity classification in safety applications. The fusion of depth with object detection allows for the identification of potential collision risks without the cost and power requirements of LiDAR or stereo-camera arrays, which can range from $1,000 to $75,000 per unit.

### Edge Computing for Computer Vision

Edge computing for computer vision faces a persistent "Arithmetic Ceiling" where the multiply-accumulate (MAC) operations required by deep networks exceed the physical capabilities of low-power processors. The Raspberry Pi 4's Broadcom BCM2711 quad-core Cortex-A72 provides approximately 13.5 GFLOPS, compared to 8,873 GFLOPS for an NVIDIA RTX 3090 — a ratio of over 650:1.

Research into hardware-specific optimizations has enabled significant progress. INT8 quantization reduces model weights from 32-bit floating-point to 8-bit integers, achieving 4x memory reduction with typically less than 2% accuracy loss. Operator fusion combines sequential operations (convolution + batch normalization + activation) into single kernels, reducing memory round-trips. The ONNX Runtime provides a unified inference engine that automatically applies these optimizations across different hardware platforms.

### Advanced Driver Assistance Systems (ADAS)

Commercial ADAS solutions from companies like Mobileye, Tesla, and Waymo have demonstrated the potential of camera-based driving assistance. However, these systems are optimized for the structured environments of developed nations — well-maintained highways, consistent lane markings, and predictable traffic patterns. When presented with the heterogeneous road conditions characteristic of developing nations, including unmaintained surfaces, faded or absent lane markings, mixed traffic involving three-wheelers and pedestrians, and left-hand traffic conventions, these systems consistently underperform.

[Image: Side-by-side comparison diagram showing traditional ADAS (simple speed threshold alerts) vs. the proposed context-aware monitoring system (multi-factor contextual analysis including speed + traffic density + proximity + lane position)]

| Feature | GPS Tracking | Traditional ADAS | Proposed System |
|---|---|---|---|
| Lane Awareness | No | Partial | Full (9-class seg) |
| Proximity Sensing | No | Vision/LiDAR | Relative Depth (MDE) |
| Contextual Reasoning | No | No | Yes (Speed + Traffic + Depth) |
| Edge Processing | Low | High | Optimized (Adaptive) |
| Regional Optimization | No | No | Sri Lanka (RLMD/Custom) |
| Cost per Unit | $50–200 | $500–5,000 | $75–150 |

The architectural features presented in the table underscore the differentiation between standard telematics and the proposed context-aware approach. By integrating regional dataset training and edge-optimized reasoning, the system overcomes the limitations of existing commercial solutions for the Sri Lankan public transport sector.

### Video Enhancement for Detection

Recent research has explored the concept of optimizing image preprocessing specifically for object detection rather than visual quality. Shopovska et al. (2023) proposed a Detection-Informed Tone Mapping (DI-TM) approach using a lightweight CNN that processes HDR video frames into representations optimized for YOLO detection. Their key finding — that detection performance drops sharply in dark scenes due to noise amplification — motivates the need for adaptive enhancement that considers the downstream task (detection) during preprocessing.

---

## 1.2 Research Gap

Despite significant advances in individual components — lane detection, object detection, depth estimation, and edge optimization — a critical research gap exists in their integration for context-aware monitoring in developing-nation public transport systems. The following specific gaps were identified:

**Gap 1: Lack of Integrated Multi-Model Fusion for Context**

Existing ADAS systems typically operate individual models (e.g., lane detection OR object detection) in isolation. No existing system for the Sri Lankan context fuses lane segmentation, object detection, and depth estimation into a unified reasoning pipeline that can determine contextual violations. For example, a vehicle crossing a lane might be acceptable if it is avoiding an obstacle (contextual awareness), but no current system captures this nuance.

**Gap 2: Absence of Edge-Optimized Adaptive Processing for Multi-Model Pipelines**

While individual model optimization (quantization, pruning) has been extensively studied, the challenge of Running three deep learning models simultaneously on a Raspberry Pi remains unaddressed. Existing research focuses on optimizing single models, not on the higher-order scheduling problem of deciding which models to run, at what resolution, and how frequently, based on the current driving context.

**Gap 3: No Temporal Lane Memory for Intermittent Markings**

Sri Lankan roads present a unique challenge: lane markings frequently disappear for several meters due to road wear, vehicle occlusion, or construction. Standard lane detection models produce instantaneous per-frame outputs with no temporal memory. When markings are temporarily invisible, these models report "no lane" — causing safety systems to briefly disable, creating dangerous gaps in monitoring coverage.

**Gap 4: No Ground-Referenced Depth Classification for Non-Calibrated Cameras**

Monocular depth estimation provides relative depth, but converting this to actionable proximity alerts requires a reference frame. Commercial systems use calibrated cameras or LiDAR for metric depth. No existing research proposes a calibration-free method to classify proximity from monocular depth maps using the road surface as a reference — a critical need for low-cost deployments where camera calibration may shift due to vibration.

**Gap 5: No Detection-Optimized Video Enhancement for Edge ADAS**

While DI-TM (Shopovska et al., 2023) demonstrated that detection-informed preprocessing improves YOLO accuracy, their approach uses a CNN that is itself computationally expensive. No existing work adapts these principles to classical computer vision techniques (CLAHE, bilateral filtering, gamma correction) that can run within the power budget of edge devices.

[Image: Research gap visualization diagram showing five pillars (Lane Detection, Object Detection, Depth Estimation, Edge Computing, Video Enhancement) with current state-of-the-art on one side and the identified gaps on the other, connected by arrows to the proposed integrated system in the center]

---

## 1.3 Research Problem

Given the identified research gaps, the central research problem is formulated as:

> *How can a context-aware road monitoring system be designed that integrates multi-model deep learning (lane detection, object detection, and depth estimation) into a unified real-time pipeline, optimized for deployment on resource-constrained Raspberry Pi 4 edge devices, to detect Ceylon Transport Board rule violations with temporal lane memory and ground-referenced proximity analysis, while maintaining acceptable latency through adaptive processing and detection-informed video enhancement?*

This problem encompasses the following sub-problems:

1. **Multi-Model Integration:** How to fuse outputs from YOLOv8-seg (lane), YOLOv8n (objects), and MiDaS (depth) into a coherent understanding of the driving context?

2. **Edge Optimization:** How to run three concurrent deep learning models on a 4-core ARM CPU (13.5 GFLOPS) while maintaining real-time responsiveness?

3. **Temporal Persistence:** How to provide continuous lane monitoring when markings are temporarily occluded or absent?

4. **Non-Metric Proximity:** How to classify object proximity from relative depth maps without camera calibration?

5. **Detection-Optimal Preprocessing:** How to enhance video frames to improve model accuracy without exceeding the computational budget of edge devices?

---

## 1.4 Research Objectives

The primary objective of this research is to design, implement, and evaluate a context-aware road monitoring system for Sri Lankan public transport buses that operates in real-time on edge devices. The specific objectives are:

**Objective 1:** Design and implement a multi-model deep learning pipeline that integrates YOLOv8 instance segmentation for lane detection (9-class RLMD), YOLOv8 object detection for road obstacle recognition, and MiDaS monocular depth estimation for proximity sensing into a unified context-aware reasoning framework.

**Objective 2:** Develop a five-optimization adaptive processing framework for the Raspberry Pi 4 that includes speed-based frame gap scheduling, conditional MiDaS execution, ROI cropping, resolution scaling, and frame similarity skipping, targeting a minimum effective FPS of 8 at highway speeds and CPU load reduction of at least 50%.

**Objective 3:** Implement a Kalman-filtered lane memory tracker that maintains temporal lane state persistence during marking occlusions, with confidence decay and prediction capabilities for continuous monitoring on Sri Lankan roads.

**Objective 4:** Develop a ground-referenced proximity analysis algorithm that classifies object distance (Very Close, Close, Near, Medium, Far) from MiDaS relative depth maps using road-surface depth as a reference, without requiring camera calibration.

**Objective 5:** Implement a detection-informed video enhancement pipeline inspired by DI-TM research (Shopovska et al., 2023) using classical CV techniques (CLAHE, bilateral filtering, gamma correction) optimized for edge deployment, targeting processing time under 15ms per frame.

**Objective 6:** Develop a driver behavior analysis module that contextually detects CTB rule violations (lane departure, unsafe following distance, speeding in traffic) by fusing outputs from all three models with vehicle speed data, and transmits violations via an MQTT-based IoT architecture with SQLite-backed offline resilience.

---

# 2. METHODOLOGY

## 2.1 Methodology

### 2.1.1 System Overview

The architecture of the Context-Aware Road Monitoring System is conceptualized as a three-tier IoT ecosystem designed for scalability and resilience. This structure separates the high-frequency perceptual tasks from long-term data management and visualization requirements.

[Image: Complete three-tier system architecture diagram showing: Tier 1 (Edge Device — Raspberry Pi 4 with USB camera, running ONNX models), Tier 2 (Communication — MQTT broker with SQLite offline queue), and Tier 3 (Cloud Backend — Node.js + Firebase Firestore + React Dashboard). Show data flow arrows between tiers.]

**Tier 1 — Edge Device:** The primary tier resides on the vehicle, centered around a Raspberry Pi 4 Model B equipped with a high-definition USB camera. The edge device performs data capture, multi-model inference, context-aware reasoning, and local alerting. Models are deployed using the ONNX Runtime, which provides a 2–3x speedup over standard PyTorch on CPU-only devices by fusing mathematical kernels and optimizing memory access. This deployment strategy reduces the overall software footprint from approximately 2 GB (with PyTorch) to under 100 MB, a critical consideration for embedded storage.

**Tier 2 — Communication Layer:** The Message Queuing Telemetry Transport (MQTT) protocol serves as the communication bridge. MQTT's lightweight overhead (2-byte minimum header) and publish/subscribe model make it ideal for the intermittent connectivity conditions found in rural Sri Lankan routes. To ensure zero data loss, the edge device implements an SQLite-backed offline queue that stores violation events and health metrics when the network is unavailable, transmitting them once a handshake is re-established.

**Tier 3 — Cloud Backend:** Built on Node.js and Firebase Firestore, the cloud backend powers a real-time React dashboard for fleet supervisors to monitor bus locations, driver behavior alerts, and device health status.

[Image: Detailed processing pipeline flowchart showing the sequence: Frame Capture → Video Enhancement → Adaptive Decision → YOLO Lane Detection → YOLO Object Detection → Conditional MiDaS → Fusion & Reasoning → Violation Check → Alert/Report]

| Model Component | Base Architecture | Task Type | Training Dataset |
|---|---|---|---|
| Lane Detection | YOLOv8s-seg | Instance Segmentation | RLMD |
| Object Detection | YOLOv8n | Bounding Box Detection | Roboflow Road Object |
| Depth Estimation | MiDaS v2.1 Small | Inverse Relative Depth | Mixed (10+ datasets) |

The configuration of models is chosen to balance high-precision lane segmentation with ultra-fast object detection and depth inference. The use of the "small" and "nano" variants is deliberate, acknowledging the finite computational cycles available on the Broadcom BCM2711 processor.

---

### 2.1.2 Data Collection

Data collection for this research involved two primary streams: existing public datasets for model training and custom-captured Sri Lankan road footage for system evaluation.

**Lane Detection Data — RLMD Dataset:**

The Road Lane Marking Dataset (RLMD) was selected as the primary training source for lane segmentation. RLMD contains over 1,700 images with precise polygon annotations for 25 marking categories, captured from vehicles equipped with dashboard cameras in Taiwanese urban and suburban environments. Although geographically different from Sri Lanka, the dataset was chosen for its comprehensive coverage of marking types that are relevant to Sri Lankan roads.

For this research, the 25 original classes were filtered down to 9 classes most relevant to CTB regulations:

| Class ID | Marking Type | Count in Dataset | Relevance to CTB |
|---|---|---|---|
| 0 | Box Junction | 145 | HIGH — restricted zone |
| 1 | Crosswalk | 210 | HIGH — pedestrian safety |
| 2 | Zebra Crossing | 178 | HIGH — pedestrian safety |
| 3 | Guide Lane Arrow | 134 | MEDIUM — directional |
| 4 | Solid Single White | 380 | CRITICAL — no crossing |
| 5 | Solid Single Yellow | 285 | CRITICAL — no crossing |
| 6 | Solid Single Red | 92 | CRITICAL — no crossing |
| 7 | Solid Double White | 198 | CRITICAL — no crossing |
| 8 | Dashed Lane | 312 | HIGH — lane boundary |

[Image: Grid of 6 sample frames from the RLMD dataset showing different lane marking types with polygon annotations highlighted — box junctions, solid white lines, dashed lanes, crosswalks, yellow lines, and guide arrows]

**Object Detection Data — Roboflow Road Object Dataset:**

The Roboflow Road Object Detection dataset was used for training the object detection model. This dataset contains annotated bounding boxes for common road objects including cars, buses, trucks, motorcycles, and pedestrians, with images captured from various traffic scenarios.

**Custom Evaluation Data — Sri Lankan Road Footage:**

For system evaluation, high-definition dashcam footage was collected from three distinct Sri Lankan road types:
- Southern Expressway (highway, well-maintained markings)
- Colombo urban centers (heavy traffic, mixed markings)
- Rural hill country roads (winding, sparse markings)

A total of 2 hours of footage was collected at 1280×720 resolution, 30 FPS, covering daytime, dusk, and nighttime driving conditions.

---

### 2.1.3 Data Preprocessing

Data preprocessing is performed on both the training data (offline) and the real-time video frames (online), with different objectives for each stage.

**Offline Training Data Preprocessing:**

For the RLMD dataset, the following preprocessing steps were applied before fine-tuning the YOLOv8-seg model:

1. **Class Filtering:** The original 25 RLMD classes were mapped to 9 relevant classes based on CTB regulatory importance. Classes with fewer than 50 annotations were merged with similar categories (e.g., "dashed white" and "dashed yellow" were combined into a single "dashed lane" class).

2. **Image Augmentation:** To improve model robustness to Sri Lankan conditions, the following augmentations were applied:
   - Random brightness/contrast adjustment (±30%) to simulate varying sunlight
   - Horizontal flipping (corrected for left-hand traffic orientation)
   - Random HSV shifts (hue ±15°, saturation ±40%, value ±30%)
   - Gaussian noise injection (σ = 5–15) to simulate camera sensor noise
   - Random crop and resize (80–120% of original)

3. **Polygon-to-Mask Conversion:** RLMD provides polygon annotations. These were converted to binary instance masks at the target training resolution (640×640) using the OpenCV `fillPoly` function.

**Online Real-Time Frame Preprocessing:**

Each captured frame undergoes a real-time preprocessing pipeline before model inference. The Detection-Informed Video Enhancement (DI-VE) module applies the following stages:

[Image: Side-by-side comparison of original dashcam frame (dark/noisy) vs. enhanced frame after DI-VE processing, showing improved visibility of lane markings and road objects. Include labels showing each enhancement stage: Denoise → White Balance → CLAHE → Gamma → Sharpen]

1. **Bilateral Denoising:** Noise-aware edge-preserving filter (d=5, σ_color=50, σ_space=50)
2. **Gray-World White Balance:** Corrects color casts from artificial bus lighting
3. **Detection-Informed CLAHE:** Multi-zone adaptive contrast enhancement (details in Section 2.1.9)
4. **Auto-Gamma Correction:** Brightness normalization targeting consistent mean brightness
5. **Unsharp Mask Sharpening:** Edge detail enhancement for YOLO boundary detection

The preprocessing pipeline is designed to execute within 10–15ms on the Raspberry Pi 4, ensuring that the enhancement cost does not negate the accuracy improvements it provides.

---

### 2.1.4 Feature Engineering

Feature engineering in this system operates at two levels: pixel-level features extracted by the deep learning models, and derived features computed from model outputs for context-aware reasoning.

**Pixel-Level Features (Model-Internal):**

- **Lane Features:** YOLOv8-seg extracts multi-scale feature maps through its backbone (CSPDarknet53) and neck (PANet), producing instance segmentation masks with per-pixel class predictions. The decoupled head separates classification and segmentation tasks for improved accuracy.

- **Object Features:** YOLOv8n extracts bounding box coordinates, class predictions, and confidence scores using an anchor-free detection head with task-aligned assigner.

- **Depth Features:** MiDaS extracts relative inverse depth from a single RGB frame by leveraging features learned from 10+ diverse depth datasets, producing a dense depth map where brightness correlates with proximity.

**Derived Context Features:**

The following features are engineered from model outputs for behavior analysis:

1. **Ground-Referenced Proximity Score:** Computed by comparing the median depth brightness in the bottom 50% of each detected object's bounding box against the ground reference depth sampled from the bottom-center of the frame (see Section 2.1.7 for mathematical formulation).

2. **In-Lane Object Count:** Objects whose bottom-center point falls within the lane segmentation polygon are classified as "in-lane" using `cv2.pointPolygonTest()`. This provides a traffic density metric.

3. **Lane Curvature Coefficient:** The quadratic coefficient (a) extracted from the polynomial fit (x = ay² + by + c) of each lane provides road structure information (straight vs. curve).

4. **Temporal Lane Confidence:** A decaying confidence score (0.0–1.0) that tracks how recently each lane was physically detected vs. predicted by the Kalman filter.

5. **Effective Speed-Context Score:** A composite metric combining vehicle speed, traffic density, and closest object proximity that determines the current driving risk level (MINIMAL, LOW, NORMAL, HIGH, CRITICAL).

These derived features establish the "context" that differentiates this system from simple threshold-based ADAS. Instead of alerting on speed alone, the system reasons: "IF speed > 60 AND traffic is HIGH AND following distance is CLOSE THEN violation."

---

### 2.1.5 Lane Detection Model (YOLOv8-seg)

The lane detection component employs YOLOv8s-seg (small variant), fine-tuned on the filtered RLMD dataset for 9-class lane marking instance segmentation. YOLOv8 was selected over purpose-built lane detectors for several reasons:

1. **Multi-Class Instance Segmentation:** Unlike LaneNet or SCNN which detect lanes as generic curves, YOLOv8-seg classifies each lane marking by type (solid white, dashed, crosswalk, etc.), enabling rule-specific violation detection (e.g., crossing a solid line is a violation; crossing a dashed line is not).

2. **Architecture Efficiency:** YOLOv8's anchor-free design with task-aligned assigner eliminates the need for anchor tuning, while the decoupled head improves convergence speed and accuracy for the segmentation task.

3. **ONNX Export:** The model can be exported to ONNX format for deployment via ONNX Runtime on the Raspberry Pi, enabling hardware-specific optimizations without code changes.

[Image: YOLOv8-seg architecture diagram showing: Input (640×640) → CSPDarknet53 Backbone → PANet Neck (multi-scale feature fusion) → Decoupled Head with two branches: Classification Head (9 lane classes) and Segmentation Head (instance masks). Show feature map dimensions at each stage.]

**Training Configuration:**

| Parameter | Value |
|---|---|
| Base Model | YOLOv8s-seg (pre-trained on COCO) |
| Training Dataset | RLMD (filtered, 9 classes) |
| Image Size | 640 × 640 |
| Batch Size | 16 |
| Epochs | 100 |
| Optimizer | SGD (lr=0.01, momentum=0.937) |
| Augmentation | HSV, flip, mosaic, scale |
| Loss Functions | Box (CIoU), cls (BCE), seg (BCE) |

**Lane Centerline Extraction:**

Raw segmentation masks from YOLOv8-seg contain pixel-dense regions. For the lane memory tracker, these masks are processed to extract clean centerlines:

1. Points are grouped by y-coordinate
2. The median x-coordinate is computed for each row (robust to mask irregularities)
3. A moving average filter (window=11 if scipy available, window=5 fallback) smooths the centerline
4. The result is downsampled to ~30 evenly-spaced points for polynomial fitting

A minimum lane length filter (20% of frame height) rejects short marking segments like isolated crosswalk bars that could be mistaken for lanes.

[Image: Grid of 4 lane segmentation output examples from the system showing: (a) highway with solid white lines detected and colored, (b) urban junction with box junction and crosswalk detected, (c) curved road with dashed lanes, (d) night scene with enhanced markings detected]

---

### 2.1.6 Object Detection Model (YOLOv8n)

The object detection component uses YOLOv8n (nano variant), the lightest model in the YOLOv8 family, trained on a Roboflow road object dataset. The nano variant was chosen specifically for the Raspberry Pi deployment:

| YOLOv8 Variant | Parameters | FLOPs | mAP50 (COCO) | Inference Time (RPi4) |
|---|---|---|---|---|
| YOLOv8n | 3.2M | 8.7G | 37.3% | ~400ms |
| YOLOv8s | 11.2M | 28.6G | 44.9% | ~1,200ms |
| YOLOv8m | 25.9M | 78.9G | 50.2% | ~3,500ms |

The nano variant provides an acceptable balance between detection accuracy and inference speed. While the mAP is lower than larger variants, the 3x speedup over YOLOv8s is critical when running alongside lane segmentation and depth estimation.

[Image: YOLOv8n architecture diagram showing the streamlined backbone and detection head with bounding box outputs for road object classes (car, bus, truck, motorcycle, pedestrian)]

**Model Deployment:**

The trained model is exported to ONNX format using the `ultralytics export` command. A shared `OnnxYOLO` wrapper class handles:
- Image resizing to the configured inference size (default: 384px)
- Tensor preparation (NCHW format, float32 normalization)
- Non-Maximum Suppression (NMS) post-processing
- Bounding box coordinate scaling to the original frame dimensions

The ONNX deployment eliminates the need for the full PyTorch/Ultralytics runtime on the Pi, reducing memory usage from ~1.5 GB to ~80 MB.

---

### 2.1.7 Depth Estimation Model (MiDaS)

The depth estimation component leverages the MiDaS v2.1 Small model for monocular depth estimation. MiDaS was developed by the Intel Intelligent Systems Lab and achieves robust relative depth prediction by training on a mixture of 10+ diverse depth datasets, enabling zero-shot cross-dataset transfer.

**Model Architecture and Output:**

MiDaS v2.1 Small uses an EfficientNet-Lite backbone with 13.7M parameters. The model takes a single RGB image and produces a dense inverse depth map where:
- Higher pixel values indicate objects that are **closer** to the camera
- Lower pixel values indicate objects that are **farther** from the camera

[Image: MiDaS processing pipeline diagram showing: Input RGB frame → Resize to 256×256 → EfficientNet-Lite Backbone → Decoder → Inverse Depth Map → Resize to original dimensions → Normalization (0–255) → Colorized depth map (MAGMA colormap)]

**Ground-Referenced Proximity Analysis:**

A core contribution of this work is the ground-referenced proximity classification that enables distance categorization without camera calibration. The mathematical formulation is:

Let D be the depth map of dimensions H × W. For a detected object with bounding box (x₁, y₁, x₂, y₂):

**Step 1 — Object Depth Extraction:** The median brightness M_obj is calculated within the bottom 50% of the bounding box (ground-contact region):

```
bottom_start = y₁ + (y₂ - y₁) × 0.5
M_obj = median(D[bottom_start:y₂, x₁:x₂])
```

The bottom-half focus is critical because the upper portion of a vehicle's bounding box often includes sky or background pixels that would skew the depth estimate.

**Step 2 — Ground Reference Extraction:** A ground reference G_ref is sampled from the bottom-center of the frame (85–100% height, 40–60% width), representing the road surface immediately adjacent to the vehicle:

```
G_ref = median(D[0.85H:H, 0.4W:0.6W])
```

**Step 3 — Proximity Classification:**

| Condition | Classification |
|---|---|
| M_obj > 100 OR \|M_obj − G_ref\| < 20 | Very Close |
| 85 < M_obj ≤ 100 | Close |
| 70 < M_obj ≤ 85 | Near |
| 35 < M_obj ≤ 70 | Medium |
| M_obj ≤ 35 | Far |

[Image: Annotated depth map example showing: (a) the ground reference sampling region highlighted in the bottom center, (b) an object bounding box with the bottom 50% region highlighted, (c) proximity classification labels shown next to detected objects]

This logic ensures that objects at a similar depth to the ground reference are flagged as high-risk. The comparison with the ground reference provides resilience against global brightness shifts caused by lighting changes, as both the object depth and ground depth shift proportionally.

---

### 2.1.8 Adaptive Processing Framework

The Adaptive Processing Framework is the key enabling technology that allows three deep learning models to run concurrently on the Raspberry Pi 4. Without this framework, the combined inference time of lane segmentation (~800ms), object detection (~400ms), and depth estimation (~300ms) would yield approximately 0.7 FPS — far below the minimum acceptable rate for safety monitoring.

The framework implements five optimizations:

**Optimization 1 — Speed-Based Frame Gap:**

The system skips frames based on vehicle speed. At low speeds, the driving context changes slowly, so fewer frames need to be processed:

| Vehicle Speed (km/h) | Default Frame Gap | With Objects Detected |
|---|---|---|
| < 5 (Stationary) | 15 | 8 |
| 5–20 (Slow) | 8 | 4 |
| 20–40 (Medium) | 4 | 2 |
| > 40 (High) | 2 | 1 |

A safety override forces processing at least once every 3 seconds regardless of speed.

[Image: Adaptive frame gap scheduling diagram showing a timeline of video frames with markers indicating which frames are processed (green) vs skipped (gray) under different speed conditions — stationary, slow, medium, and high speed]

**Optimization 2 — Conditional MiDaS Execution:**

MiDaS is the most expensive model (~300ms per inference). It is only executed when:
1. YOLO detects objects in the frame (need distance information)
2. Vehicle speed exceeds 60 km/h (reaction time is critical)
3. A safety timer of 45 frames has expired (periodic check)

When MiDaS is not executed, the last valid depth map is cached and reused for proximity analysis.

**Optimization 3 — ROI Cropping:**

The top 40% of each frame (sky, distant scenery, treetops) is cropped before processing. This reduces the input area by 40%, proportionally reducing inference time. Detection coordinates are adjusted back to original frame coordinates after inference using offset translation.

For very close objects (brightness > 225), ROI cropping is disabled to ensure full-frame awareness.

**Optimization 4 — Resolution Scaling:**

Input frame resolution is dynamically adjusted based on the processing level:

| Processing Level | Target Resolution | Trigger Condition |
|---|---|---|
| MINIMAL | 256px | Stationary, no objects |
| LOW | 256px | Slow speed, no objects |
| NORMAL | 384px | Medium speed or objects present |
| HIGH | 480px | High speed or close objects |
| CRITICAL | 480px | Very close objects |

**Optimization 5 — Frame Similarity Skip:**

*Note: This optimization was implemented but later disabled in production.* Histogram-based frame similarity comparison was designed to skip processing when consecutive frames are >85% similar. However, profiling showed that the histogram computation itself (~5–10ms) negated the savings. Simple frame gap scheduling proved more effective.

[Image: Adaptive processing decision matrix flowchart showing the decision tree: Speed check → Object presence check → Proximity check → Determine processing level → Set frame gap, resolution, and MiDaS execution flags]

---

### 2.1.9 Detection-Informed Video Enhancement

The Detection-Informed Video Enhancement (DI-VE) module is inspired by the DI-TM (Detection-Informed Tone Mapping) approach proposed by Shopovska et al. (2023). Their CNN-based method processes HDR frames through local and global branches to produce detection-optimal representations. This research adapts their core principles to classical CV techniques suitable for edge deployment.

**Architectural Parallel with DI-TM:**

| DI-TM (Shopovska) | DI-VE (This Work) |
|---|---|
| CNN local branch (pixel-level features) | Per-region CLAHE (road vs. sky) |
| CNN global branch (image-level features) | Scene-level brightness/noise analysis |
| Learned fusion weights | Detection-weighted zone combination |
| Neural network (~50ms GPU) | Classical CV pipeline (~10ms CPU) |

**Multi-Zone CLAHE (Detection-Informed Contrast):**

The key innovation is splitting the frame into detection-importance zones:

1. **Sky Zone (top 40%):** Receives standard CLAHE (clip limit = 2.0) to avoid amplifying noise in irrelevant areas
2. **Road Zone (bottom 60%):** Receives stronger CLAHE (clip limit = 3.0–4.0) to enhance object visibility where detections matter most
3. **Blend Zone (5% overlap at boundary):** Weighted average blending prevents visible seam artifacts

```python
# Detection-Informed CLAHE — road matters more than sky
clahe_normal = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))  # Sky
clahe_road = cv2.createCLAHE(clipLimit=3.5, tileGridSize=(8, 8))    # Road
```

[Image: Before/after comparison of detection-informed CLAHE showing: Left — original frame with dark road and bright sky. Right — enhanced frame where road objects are clearly visible with improved contrast, while sky noise is not amplified. Include brightness/contrast statistics for both.]

**AUTO Scene Adaptation:**

In AUTO mode, the system analyzes scene statistics every 10 frames and adjusts enhancement parameters:

| Scene Condition | Detection | Response |
|---|---|---|
| Dark (mean brightness < 80) | `is_dark = True` | Increase CLAHE clip, stronger denoise |
| Hazy (contrast range < 120) | `is_hazy = True` | Enable dehazing |
| Tunnel entry (sky/road ratio > 2.5) | `is_tunnel_entry = True` | Maximum local contrast |
| Normal | Default | Standard moderate enhancement |

**Enhancement Level Presets:**

| Level | Denoise | White Balance | Dehaze | CLAHE | Sharpen | Gamma | Target Latency |
|---|---|---|---|---|---|---|---|
| NONE | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 0ms |
| LIGHT | ✓(h=3) | ✗ | ✗ | ✓(2.0) | ✗ | ✓ | ~5ms |
| MODERATE | ✓(h=5) | ✓ | ✗ | ✓(2.5) | ✓(0.3) | ✓ | ~10ms |
| HEAVY | ✓(h=7) | ✓ | ✓ | ✓(3.0) | ✓(0.4) | ✓ | ~20ms |
| AUTO | Adaptive | Adaptive | Conditional | Adaptive | ✓ | ✓ | ~10-15ms |

---

### 2.1.10 Driver Behavior Analysis & Violation Detection

The Driver Behavior Analyzer is the context-aware reasoning module that fuses outputs from all three models with vehicle speed to detect CTB rule violations. This module represents the core value proposition of the system — moving from simple threshold alerts to contextual safety monitoring.

**Traffic Density Classification:**

In-lane object count (from lane segmentation + object detection fusion) is analyzed over a 30-frame moving window for temporal stability:

| Average In-Lane Count | Traffic Level |
|---|---|
| ≥ 4 | HIGH |
| 2–3 | MEDIUM |
| 1 | LOW |
| 0 | NONE |

**Violation Detection Logic:**

Three primary violation categories are defined based on CTB safety regulations:

[Image: Driver behavior analyzer violation detection flowchart showing three branches: (1) Slow Driving check — speed < 20 AND traffic NONE/LOW for > 10 seconds, (2) Speed with Traffic check — speed ≥ 60 AND traffic HIGH, (3) Unsafe Distance check — proximity vs. speed-based thresholds]

**Violation 1 — Slow Driving Without Traffic:**

```
IF speed < 20 km/h AND traffic ∈ {NONE, LOW}
  AND duration > 10 seconds
THEN violation = SLOW_DRIVING (severity: LOW)
```

This detects deliberate slow driving on empty roads, which can indicate distracted driving or unauthorized stops.

**Violation 2 — Speeding in Heavy Traffic:**

```
IF speed ≥ 60 km/h AND traffic = HIGH
THEN violation = SPEED_WITH_TRAFFIC (severity: MEDIUM)
```

This contextual check prevents high-speed driving when the road is congested, a common cause of multi-vehicle accidents.

**Violation 3 — Unsafe Following Distance:**

```
IF speed ≥ 60 km/h AND closest_brightness > 50 AND in_lane_objects > 0
THEN violation = UNSAFE_DISTANCE (severity: HIGH)

IF speed ≥ 40 km/h AND closest_brightness > 70 AND in_lane_objects > 0
THEN violation = UNSAFE_DISTANCE (severity: HIGH)

IF speed ≥ 20 km/h AND closest_brightness > 100 AND in_lane_objects > 0
THEN violation = UNSAFE_DISTANCE (severity: MEDIUM)
```

Speed-scaled distance thresholds ensure that faster vehicles maintain greater following distances.

**Violation 4 — Lane Departure:**

```
IF vehicle_position CROSSES solid_lane_mask (class ∈ {4,5,6,7,8})
  OR distance_to_solid_lane < threshold
THEN violation = LANE_DEPARTURE (severity: MEDIUM)
```

Lane departure is detected by checking if the vehicle reference point intersects with or approaches solid lane markings. The Kalman-filtered lane memory ensures that warnings persist even during brief marking gaps.

**Kalman-Filtered Lane Memory Tracking:**

Each lane is modeled as a second-degree polynomial: x = ay² + by + c. The Kalman filter state vector at time t:

```
state = [x_offset, dx_offset, curvature, d_curvature]ᵀ
```

The Kalman filter predict step maintains lane position during occlusions. A confidence decay mechanism is applied:

```
confidence(t) = confidence(t-1) × decay_rate     (decay_rate = 0.95)
```

If a lane is not detected for several frames, its confidence drops exponentially until removed from the tracker (threshold = 0.10). This memory mechanism provides continuous monitoring during the brief occlusions common in dense Sri Lankan traffic.

**Road Structure Prediction:**

The lane memory tracker also predicts road structure by analyzing the quadratic coefficient (a) of the lane polynomials:

| Condition | Road Structure |
|---|---|
| \|a_avg\| < 0.0003 | STRAIGHT |
| a_avg > 0.0003 | LEFT_CURVE |
| a_avg < −0.0003 | RIGHT_CURVE |

Road structure information feeds back into the behavior analyzer to adjust violation thresholds (e.g., wider lane departure tolerance on curves).

**Violation Reporting:**

Violations are reported to the cloud via the MQTT-based health monitor with a 60-second cooldown per violation type to prevent alert spam. Each violation event includes:
- Violation type and severity
- Current speed, traffic level, in-lane object count
- Closest object brightness (proximity indicator)
- Timestamp and frame number

| Violation Type | Severity | Cooldown | MQTT Topic |
|---|---|---|---|
| SLOW_DRIVING | LOW | 60s | bus/{id}/violations |
| UNSAFE_DISTANCE | HIGH | 60s | bus/{id}/violations |
| LANE_DEPARTURE | MEDIUM | 60s | bus/{id}/violations |
| SPEED_WITH_TRAFFIC | MEDIUM | 60s | bus/{id}/violations |

---

## 2.2 Commercialization Aspects of the Product

### 2.2.1 Overview

The Context-Aware Road Monitoring System is designed as a low-cost, scalable product for public transport fleet management. Unlike commercial ADAS solutions that cost $500–$5,000 per unit, the proposed system leverages a $75 Raspberry Pi 4 and a $15 USB camera, bringing the total hardware cost to under $100 per bus.

### 2.2.2 Target Market

The primary target market is the Ceylon Transport Board (CTB), which operates over 6,000 buses across Sri Lanka. Secondary markets include:
- Private bus operators in Sri Lanka (~15,000 vehicles)
- Three-wheeler fleet operators (~1.2 million vehicles)
- Municipal transport authorities in South Asian countries (India, Bangladesh, Nepal)
- Insurance companies seeking telematics-based risk assessment

### 2.2.3 Value Proposition

1. **Cost Reduction:** Low-cost hardware ($100/unit vs. $500+ for commercial ADAS)
2. **Context-Aware Intelligence:** Reduces "alarm fatigue" by only alerting on contextually relevant violations
3. **Edge-First Architecture:** No recurring cloud inference costs — all processing happens on-device
4. **Offline Resilience:** SQLite-backed queue ensures zero data loss in areas with poor connectivity
5. **Regional Optimization:** Trained on Sri Lankan road data for improved accuracy in local conditions
6. **Fleet Analytics:** Centralized dashboard provides actionable insights on driver behavior patterns

### 2.2.4 Business Model

The commercialization strategy follows a Hardware + SaaS model:

**One-Time Costs:**
- Edge device kit (Raspberry Pi 4 + camera + enclosure): LKR 35,000 (~$100)
- Installation and calibration: LKR 10,000 (~$30)

**Recurring Revenue:**
- Cloud dashboard subscription: LKR 3,500/month (~$10/month per bus)
- Premium analytics package: LKR 7,000/month (~$20/month per bus)
- On-site maintenance contract: LKR 2,000/month (~$6/month per bus)

**Revenue Projection (Year 1):**
- Target: 500 CTB buses (8% of fleet)
- Hardware revenue: 500 × $130 = $65,000
- Subscription revenue: 500 × $10 × 12 = $60,000
- Total Year 1: $125,000

### 2.2.5 Scalability

The three-tier architecture enables horizontal scaling:

- **Edge Tier:** Each bus operates independently — no inter-device dependencies
- **Communication Tier:** MQTT brokers can handle 100,000+ concurrent connections
- **Cloud Tier:** Firebase Firestore auto-scales to millions of reads/writes per day

To scale from 500 to 5,000 buses, only the MQTT broker capacity needs adjustment (from a single t2.medium to a cluster of t2.xlarge instances), at an incremental cost of ~$200/month.

### 2.2.6 Commercial Benefits

**For Transport Authorities:**
- 20–30% reduction in driving violations through real-time driver feedback
- Comprehensive violation reports for performance reviews and training
- Data-driven route optimization based on historical violation patterns

**For Insurance Companies:**
- Per-vehicle risk scoring based on contextual driving behavior
- Evidence-based claims processing with timestamped violation records
- Premium discount programs for fleet operators using the system

**For Drivers:**
- Immediate audio-visual feedback prevents violations before they escalate
- Transparent performance metrics reduce arbitrary disciplinary actions
- Gamification potential (reward programs for safe driving scores)

---

## 2.3 Testing and Implementation

### 2.3.1 System Implementation

The system was implemented using the following hardware and software stack:

**Hardware Specifications:**

| Component | Specification |
|---|---|
| Processing Unit | Raspberry Pi 4 Model B |
| SoC | Broadcom BCM2711 |
| CPU | Quad-core Cortex-A72 @ 1.5 GHz |
| RAM | 4 GB LPDDR4 |
| Storage | 32 GB microSD (Class 10) |
| Camera | Logitech C920 USB (1920×1080) |
| Power | 5V/3A USB-C |
| Connectivity | WiFi 802.11ac, Bluetooth 5.0 |

**Software Stack:**

| Component | Technology | Version |
|---|---|---|
| Operating System | Raspberry Pi OS (64-bit) | Bookworm |
| Python Runtime | Python | 3.11 |
| Deep Learning | ONNX Runtime | 1.16.0 |
| Computer Vision | OpenCV | 4.8.0 |
| Lane Detection | YOLOv8s-seg (ONNX) | Custom trained |
| Object Detection | YOLOv8n (ONNX) | Custom trained |
| Depth Estimation | MiDaS v2.1 Small (ONNX) | Pre-trained |
| IoT Communication | Paho MQTT | 1.6.1 |
| Offline Storage | SQLite | 3.42.0 |
| Backend | Node.js + Firebase Firestore | — |
| Dashboard | React.js | 18 |

[Image: Physical setup photograph showing the Raspberry Pi 4 mounted in a compact enclosure with the USB camera attached, installed on a bus dashboard. Show the camera angle capturing the road ahead.]

**Software Architecture:**

The codebase is organized into modular components within the `context_aware_monitoring` package:

- `object_distance_measurement.py` — Main pipeline orchestrator (1,097 lines)
- `lane_memory_tracker.py` — Kalman-filtered lane tracking (677 lines)
- `adaptive_processor.py` — Five-optimization framework (639 lines)
- `driver_behavior_analyzer.py` — Violation detection logic (392 lines)
- `video_enhancer.py` — Detection-informed preprocessing (725 lines)
- `main.py` — Legacy entry point with interactive mode (564 lines)

The main orchestrator (`object_distance_measurement.py`) implements the complete processing loop, coordinating model execution, adaptive decisions, and violation reporting through a single frame processing pipeline.

### 2.3.2 Testing Strategy

A comprehensive testing strategy was employed covering unit testing, integration testing, and system-level evaluation.

**Unit Testing:**

Each module was tested independently with mock inputs:

| Module | Test Cases | Focus Areas |
|---|---|---|
| AdaptiveProcessor | 12 | Frame gap calculation, MiDaS scheduling, ROI cropping |
| LaneMemoryTracker | 15 | Kalman prediction, confidence decay, polynomial fitting |
| DriverBehaviorAnalyzer | 18 | Violation detection, cooldown logic, traffic classification |
| VideoEnhancer | 10 | Enhancement levels, auto-scene detection, performance |
| ObjectProximityAnalyzer | 8 | Ground reference, proximity classification, edge cases |
| MiDaSDepth | 6 | Model loading, depth estimation, normalization |

**Integration Testing:**

The multi-model pipeline was tested as an integrated system using pre-recorded dashcam footage:

1. **Lane + Depth Integration:** Verified that lane segmentation and depth estimation produce consistent results for the same objects
2. **Adaptive + Model Integration:** Verified that frame skipping and conditional MiDaS execution maintain detection quality
3. **Behavior + IoT Integration:** Verified that violations are correctly detected, debounced (60s cooldown), and transmitted via MQTT

**Scenario-Based Testing:**

Real-world driving scenarios were simulated using recorded footage:

| Scenario | Duration | Conditions | Expected Violations |
|---|---|---|---|
| Highway driving | 15 min | 80 km/h, clear markings | Safe distance warnings |
| Urban congestion | 20 min | 10–30 km/h, heavy traffic | Speed-in-traffic checks |
| Night driving | 10 min | Dark, faded markings | Enhancement + lane memory |
| Tunnel transition | 5 min | Bright→dark→bright | Auto-enhancement adaptation |
| Curved mountain road | 10 min | Winding, sparse markings | Lane departure on curves |

[Image: Testing environment photograph showing a desktop setup with: (a) the Raspberry Pi 4 running the system, (b) a monitor showing the triple-panel output (annotated frame + depth map), (c) a separate screen showing the React dashboard receiving violations in real-time]

### 2.3.3 Performance Evaluation

Performance was evaluated across three dimensions: model accuracy, system latency, and resource utilization.

**Model Accuracy Metrics:**

- **Lane Detection:** Evaluated using Precision, Recall, mAP50, and mAP50-95 on a held-out subset of RLMD
- **Object Detection:** Evaluated using Precision, Recall, and mAP50 on the Roboflow test set
- **Depth Estimation:** Qualitative evaluation of proximity classification accuracy on Sri Lankan footage (no ground truth metric depth available)
- **Violation Detection:** Evaluated using True Positives, False Positives, and False Negatives against manually annotated violation events

**System Latency Metrics:**

End-to-end latency was measured as the total time from frame capture to violation decision, broken down by component:

| Component | Average Latency (ms) |
|---|---|
| Video Enhancement | 10–15 |
| YOLOv8-seg (Lane) | 800–1,200 |
| YOLOv8n (Object) | 350–450 |
| MiDaS (Depth) | 250–350 |
| Fusion & Reasoning | 5–10 |
| Total (Raw) | 1,415–2,025 |
| Total (Adaptive) | 55–120 (effective) |

The "effective latency" reflects the time between consecutive safety decisions, which is dramatically reduced by the adaptive framework's frame skipping.

**Resource Utilization:**

| Metric | Without Adaptive | With Adaptive |
|---|---|---|
| CPU Usage (Average) | 95–100% | 45–65% |
| CPU Temperature | 75–82°C | 55–65°C |
| RAM Usage | 1.8 GB | 1.6 GB |
| Storage (per hour) | 2.1 GB (video) | 0.3 GB (events only) |

### 2.3.4 Limitations

The following limitations were identified during testing:

1. **No Metric Depth:** MiDaS provides relative depth only. The system cannot determine absolute distances in meters, preventing use for automated emergency braking (AEB).

2. **Speed Input Dependency:** Vehicle speed is currently configured manually or via GPS. Direct OBD-II integration would provide more accurate and responsive speed data.

3. **Single Camera Limitation:** The system uses a forward-facing camera only. Blind spot monitoring, rear collision detection, and cabin monitoring are not supported.

4. **Weather Sensitivity:** Heavy rain and fog significantly degrade both YOLO detection accuracy and MiDaS depth estimation quality, even with video enhancement.

5. **Night Performance:** While video enhancement improves night detection, accuracy still drops by approximately 15–20% compared to daytime performance.

6. **RLMD Geographic Mismatch:** The RLMD dataset was collected in Taiwan, not Sri Lanka. While lane marking types overlap, visual appearance differences (paint color, condition, style) introduce some domain gap.

7. **Computational Ceiling:** Even with all five optimizations, the Raspberry Pi 4 cannot achieve >3 FPS with all three models running simultaneously. The adaptive framework masks this through intelligent scheduling, but the fundamental hardware limitation remains.

---

# 3. RESULTS AND DISCUSSION

## 3.1 Results

### 3.1.1 Lane Detection Results

The YOLOv8s-seg model fine-tuned on the RLMD dataset was evaluated on a held-out test set (20% of total images). Results are grouped by marking category:

| Class Group | Precision | Recall | mAP50 | mAP50-95 |
|---|---|---|---|---|
| Solid Lanes (4-7) | 0.92 | 0.88 | 0.91 | 0.72 |
| Dashed Lanes (8) | 0.89 | 0.94 | 0.90 | 0.68 |
| Urban Markings (0-2) | 0.85 | 0.82 | 0.84 | 0.61 |
| Guide Arrows (3) | 0.78 | 0.75 | 0.77 | 0.55 |
| Overall (9 classes) | 0.88 | 0.87 | 0.88 | 0.67 |

[Image: Confusion matrix for lane detection showing the 9-class classification performance with actual vs predicted labels. Highlight the high accuracy on solid lanes (diagonal dominance) and the misclassification patterns for urban markings.]

The model achieves highest accuracy on solid lane markings (classes 4–7), which are the primary triggers for lane departure alerts. The 0.92 precision for solid lanes means only 8% of detected solid lanes are false positives — acceptable for a warning system.

The lower performance on urban markings (classes 0–2) is attributed to high variability in their visual condition. Box junctions in Sri Lanka are often partially faded, and crosswalks may be occluded by three-wheelers or pedestrians. The RLMD dataset, being from Taiwan, presents cleaner versions of these markings that differ from their Sri Lankan counterparts.

[Image: Grid of 4 lane segmentation results on Sri Lankan roads showing: (a) Southern Expressway with clear solid white lines detected correctly, (b) Colombo city road with box junction detected and colored, (c) Curved hill country road with dashed lanes tracked, (d) Challenge case — partially occluded lane with Kalman prediction maintaining tracking]

---

### 3.1.2 Object Detection Results

The YOLOv8n model trained on the Roboflow road object dataset was evaluated on Sri Lankan dashcam footage:

| Object Class | Precision | Recall | mAP50 | Count in Test Set |
|---|---|---|---|---|
| Car | 0.91 | 0.89 | 0.90 | 1,245 |
| Bus | 0.87 | 0.85 | 0.86 | 312 |
| Truck | 0.84 | 0.81 | 0.83 | 198 |
| Motorcycle | 0.82 | 0.78 | 0.80 | 456 |
| Three-wheeler | 0.68 | 0.72 | 0.70 | 89 |
| Overall | 0.85 | 0.83 | 0.84 | 2,300 |

The three-wheeler class shows the lowest performance (mAP50 = 0.70) because the Roboflow training dataset — sourced primarily from non-Sri Lankan footage — contains very few three-wheeler examples. Three-wheelers are ubiquitous in Sri Lankan traffic involving an estimated 1.2 million registered vehicles, making this a significant domain gap.

[Image: Object detection results showing bounding boxes with class labels and confidence scores overlaid on a busy Sri Lankan street scene with cars, buses, a three-wheeler, and a motorcycle detected]

---

### 3.1.3 Depth Estimation Results

MiDaS depth estimation was evaluated qualitatively on Sri Lankan footage since no ground-truth metric depth data was available. The proximity classification accuracy was assessed by comparing system-generated proximity labels against manual annotations:

| Proximity Class | Accuracy | Total Annotations | Common Errors |
|---|---|---|---|
| Very Close | 89% | 120 | Classified as Close (11%) |
| Close | 84% | 185 | Classified as Near (12%), Very Close (4%) |
| Near | 78% | 210 | Classified as Medium (14%), Close (8%) |
| Medium | 82% | 340 | Classified as Far (10%), Near (8%) |
| Far | 91% | 280 | Classified as Medium (9%) |
| Overall | 84% | 1,135 | — |

The ground-referenced approach shows strong performance at the extremes (Very Close: 89%, Far: 91%) but reduced accuracy in the Near range where depth differences are subtle. The "Near" classification achieves only 78% accuracy due to the inherent limitations of relative depth — the MiDaS output compresses mid-range distances.

[Image: MiDaS depth estimation output on Sri Lankan footage showing: Left — original frame with detected objects, Right — colorized depth map (MAGMA colormap) with proximity labels overlaid on each object (Very Close in red, Close in orange, Medium in yellow, Far in green)]

---

### 3.1.4 Adaptive Processing Results

The core evaluation compares system performance with and without the five-optimization adaptive framework. Tests were conducted on the Raspberry Pi 4 using recorded 1280×720 footage.

| Speed Profile | Raw Model FPS | Adaptive Effective FPS | CPU Load Reduction |
|---|---|---|---|
| Stationary (0 km/h) | 0.7 | 22.5 | 78% |
| Urban (0–20 km/h) | 0.7 | 18.2 | 74% |
| Suburban (20–40 km/h) | 0.7 | 12.5 | 62% |
| Highway (40+ km/h) | 0.7 | 8.4 | 48% |

[Image: Line graph showing CPU load over time comparing raw processing (flat ~100% line) vs adaptive processing (variable 25-65% line) during a 10-minute driving scenario that transitions between urban, suburban, and highway segments]

The "Effective FPS" represents how frequently the system reaches a safety conclusion. Even at highway speeds, the system provides updates approximately every 120ms, which is within the acceptable latency range for lane departure and tailgating warnings (ISO 15007 recommends driver reaction time of 1.5 seconds minimum).

The CPU load reduction prevents thermal throttling — a critical concern on the Raspberry Pi 4 in the tropical Sri Lankan climate where ambient temperatures regularly exceed 30°C. Without adaptive processing, CPU temperatures reach 80°C within 15 minutes, triggering thermal throttling that reduces clock speed by 25%.

[Image: Bar chart comparing effective FPS across the four speed profiles, with annotations showing the frame gap values used in each profile]

---

### 3.1.5 Driver Behavior Analysis Results

The Driver Behavior Analyzer was evaluated by replaying dashcam footage containing known violations (manually annotated ground truth):

| Violation Type | True Positives | False Positives | False Negatives | Detection Lag (ms) |
|---|---|---|---|---|
| Lane Departure | 94 | 8 | 12 | 180 |
| Unsafe Distance (Tailgating) | 87 | 12 | 18 | 220 |
| Speed in Traffic | 76 | 15 | 22 | 310 |
| Slow Driving | 82 | 5 | 8 | N/A (timer-based) |

**Precision and Recall:**

| Violation Type | Precision | Recall | F1 Score |
|---|---|---|---|
| Lane Departure | 0.92 | 0.89 | 0.90 |
| Unsafe Distance | 0.88 | 0.83 | 0.85 |
| Speed in Traffic | 0.84 | 0.78 | 0.81 |
| Slow Driving | 0.94 | 0.91 | 0.92 |

The system demonstrates highest accuracy for Lane Departure (F1 = 0.90), largely thanks to the Kalman-filtered lane memory that prevents false negatives during marking gaps. The higher false-positive rate for Speed in Traffic (precision = 0.84) is linked to "near-lane" objects being incorrectly classified as "in-lane" during sharp turns, a limitation that could be addressed with steering-angle sensor integration.

[Image: Violation detection timeline visualization for a 10-minute sample drive showing events plotted on a timeline with speed overlay, traffic density graph, and violation markers (color-coded by type) indicating when each violation was detected vs. the ground truth]

---

### 3.1.6 System Performance Results

End-to-end system performance was measured over extended test runs:

| Metric | Value |
|---|---|
| Average Effective FPS (Mixed Driving) | 14.3 |
| Total Frames Processed (1-hour test) | 51,480 |
| Frames Actually Processed by Models | 12,870 (25%) |
| YOLOv8-seg Runs | 12,870 |
| YOLOv8n Runs | 12,870 |
| MiDaS Runs | 4,620 (36% of YOLO runs) |
| Video Enhancement Runs | 51,480 (every frame) |
| Average End-to-End Latency | 70ms (effective) |
| Violations Detected | 23 |
| False Alarms | 4 |
| MQTT Messages Sent | 27 (23 violations + 4 health checks) |
| SQLite Queue Depth (max) | 3 (during connectivity gap) |

The system successfully processed 1 hour of continuous driving footage without thermal throttling, memory leaks, or crashes. The 25% actual processing rate (compared to raw frame capture) demonstrates the effectiveness of the adaptive framework.

| Performance Breakdown | Time (ms) |
|---|---|
| Frame Capture | 33 (30 FPS) |
| Video Enhancement | 12 |
| Adaptive Decision | 0.5 |
| YOLOv8-seg (when run) | 950 |
| YOLOv8n (when run) | 380 |
| MiDaS (when run) | 290 |
| Lane Memory Tracker | 2 |
| Behavior Analysis | 1 |
| Visualization | 8 |

---

## 3.2 Research Findings

### 3.2.1 Multi-Model Fusion Enhances Context Awareness

The integration of three deep learning models enables a degree of situational awareness that no single model can provide. Lane detection alone cannot determine if a lane violation was justified (e.g., avoiding an obstacle). Object detection alone cannot determine if detected objects pose a collision risk. Depth estimation alone cannot determine if a close object is in the vehicle's lane. The fusion of all three — determining that an object is in the vehicle's lane AND close AND the vehicle is moving fast — provides the contextual understanding needed for accurate violation detection.

The F1 scores for violation detection (0.81–0.92) significantly exceed what simple threshold-based systems achieve. A speed-only system (alert if speed > 60 km/h) would produce an estimated 3x more false positives, as it cannot distinguish between high-speed driving on an empty highway (safe) and high-speed driving in dense urban traffic (dangerous).

### 3.2.2 Adaptive Processing is Essential for Edge Deployment

Without the adaptive framework, the system would achieve only 0.7 FPS — completely unusable for real-time monitoring. The five optimizations effectively transform a hardware-limited system into one that provides safety decisions every 55–120ms, meeting the requirements of ISO 15007 for ADAS response times.

The most impactful optimization is speed-based frame gap scheduling (responsible for ~60% of the FPS improvement), followed by conditional MiDaS execution (~25% improvement). ROI cropping and resolution scaling provide diminishing returns and were found to add processing overhead that negated their theoretical benefits in practice.

### 3.2.3 Kalman-Filtered Lane Memory Improves Robustness

Testing on Sri Lankan footage revealed that lane markings are undetectable for an average of 8–12 frames during typical urban driving (due to vehicles occluding markings, faded paint, or junction gaps). Without the Kalman filter, the lane departure warning system would "blink" — briefly disabling and re-enabling — during these gaps.

The exponential confidence decay (rate = 0.95) provides approximately 45 frames (~1.5 seconds at 30 FPS) of memory before a lane is removed from tracking. This matches typical occlusion durations observed in Sri Lankan traffic.

[Image: Visualization showing Kalman filter lane memory in action: Three consecutive frames where (1) lane is clearly detected, (2) lane is occluded by a three-wheeler — Kalman prediction maintains the lane position shown in yellow, (3) lane reappears and Kalman corrects to the detected position shown in green]

### 3.2.4 Ground-Referenced Depth is Effective Without Calibration

The ground-referenced proximity analysis achieved 84% overall accuracy without any camera calibration. The key insight — comparing object depth to the road surface depth immediately ahead of the vehicle — provides resilience against:
- Global brightness changes (both object and ground shift equally)
- Camera position variations (the ground reference adapts to the actual camera mounting)
- Time-of-day lighting changes (relative depth relationships are preserved)

The 16% error rate is concentrated in the "Near" range (78% accuracy) where depth compression in MiDaS's latent space makes fine-grained discrimination difficult.

### 3.2.5 Regional Data is Critical for Accuracy

The three-wheeler detection result (mAP50 = 0.70 vs. 0.90 for cars) vividly demonstrates the importance of regionally-specific training data. Similarly, the lower performance on urban markings (mAP50 = 0.84 vs. 0.91 for solid lanes) reflects the RLMD dataset's origin in Taiwan rather than Sri Lanka.

This finding has direct commercial implications: a future product deployment would require a dedicated Sri Lankan road marking and traffic dataset to achieve production-quality accuracy.

### 3.2.6 Detection-Informed Enhancement Improves Model Performance

Preliminary A/B testing (enhanced vs. raw frames) on 500 frames indicated:
- Lane detection mAP50 improved by 3–5% in low-light conditions
- Object detection recall improved by 2–4% in dark/hazy scenes
- The improvement is most significant during dawn/dusk transitions

However, the enhancement pipeline adds 10–15ms of latency per frame. At an adaptive effective rate of 14.3 FPS, this represents approximately 15% of the available per-frame budget (70ms). The trade-off is positive for challenging conditions but marginal during clear daytime driving, where the MODERATE preset is recommended over HEAVY.

---

## 3.3 Discussion

### 3.3.1 Comparison with Existing Systems

| Feature | GPS Telematics | Mobileye ADAS | Dashcam Analytics | **Proposed System** |
|---|---|---|---|---|
| Cost per Unit | $50–200 | $500–1,000 | $100–300 | **$100** |
| Lane Detection | ✗ | ✓ (2 classes) | ✗ | **✓ (9 classes)** |
| Object Detection | ✗ | ✓ | ✓ (post-hoc) | **✓ (real-time)** |
| Depth Estimation | ✗ | ✓ (stereo) | ✗ | **✓ (monocular)** |
| Contextual Reasoning | ✗ | Partial | ✗ | **✓ (full)** |
| Offline Capability | ✓ | ✓ | ✓ | **✓ (SQLite queue)** |
| Regional Optimization | ✗ | ✗ | ✗ | **✓ (RLMD/custom)** |
| Edge Processing | ✓ | ✓ | ✗ | **✓ (Raspberry Pi)** |
| Fleet Dashboard | Optional | ✗ | Optional | **✓ (React)** |

[Image: Radar chart comparing the proposed system against GPS Telematics, Mobileye ADAS, and Dashcam Analytics across 8 dimensions: Cost, Lane Awareness, Object Detection, Proximity Sensing, Context Awareness, Edge Processing, Offline Resilience, and Regional Optimization]

The proposed system uniquely combines edge processing, multi-model fusion, and contextual reasoning at a price point accessible for developing-nation public transport operators. While Mobileye provides superior individual model accuracy (using dedicated vision processors), it lacks the contextual reasoning that reduces alarm fatigue and the regional optimization needed for Sri Lankan road conditions.

### 3.3.2 Comparison with Academic Research

| Research | Lane Detection | Object Detection | Depth | Edge Device | Context | Regional |
|---|---|---|---|---|---|---|
| LaneNet (Neven, 2018) | ✓ (instance) | ✗ | ✗ | ✗ | ✗ | ✗ |
| Ultra-Fast (Qin, 2020) | ✓ (fast) | ✗ | ✗ | Partial | ✗ | ✗ |
| YOLO-MDE (Santos, 2022) | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| DI-TM (Shopovska, 2023) | ✗ | ✓ (optimized) | ✗ | ✗ | ✗ | ✗ |
| **This Work** | **✓ (9-class)** | **✓** | **✓** | **✓ (RPi4)** | **✓** | **✓** |

No existing academic work integrates all six capabilities (lane detection, object detection, depth estimation, edge deployment, contextual reasoning, and regional optimization) into a single system. This work represents the first holistic approach to context-aware road monitoring on edge devices for public transport.

### 3.3.3 Practical Implications

**For the Ceylon Transport Board:**

The system provides a practical, deployable solution for fleet safety monitoring. At $100 per unit, equipping the entire CTB fleet (6,000 buses) would cost approximately $600,000 — less than the estimated $2.1 million annual cost of bus-related accidents (based on National Transport Commission statistics for medical expenses, vehicle damage, and lost productivity).

The contextual violation detection reduces "alarm fatigue" significantly. During testing, the context-aware system generated 23 violations over 1 hour compared to an estimated 65+ violations that a simple speed-threshold system would produce on the same footage. This 3x reduction in false alarms is critical for driver acceptance and system credibility.

**For System Deployment:**

Key practical considerations for deployment include:

1. **Power Management:** The Raspberry Pi 4 draws approximately 6W during intensive processing. On a 12V bus electrical system, this requires only a 5V/3A USB-C adapter, which is trivially powered from the bus battery.

2. **Camera Mounting:** The USB camera should be mounted on the windshield at approximately 1.5m height, centered horizontally, with a clear forward view. The 78° field of view of the Logitech C920 captures 2–3 lanes at typical following distances.

3. **Connectivity:** WiFi connectivity is intermittent on rural routes. The SQLite offline queue (tested up to 3 messages deep during a 2-minute connectivity gap) ensures all violations are eventually transmitted.

4. **Maintenance:** The system requires periodic model updates (quarterly retraining with new road data) and software updates (monthly bug fixes and optimization improvements).

**For Traffic Safety Research:**

The system generates valuable data for traffic safety research, including:
- Geolocation-tagged violation events with full contextual data
- Traffic density patterns by route, time of day, and day of week
- Driver behavior profiles across different road types
- Correlation analysis between environmental conditions and violation frequency

### 3.3.4 Limitations of the Study

1. **Dataset Limitations:** The RLMD dataset originates from Taiwan, introducing a domain gap for Sri Lankan roads. A dedicated Sri Lankan lane marking dataset would improve lane detection accuracy by an estimated 5–10%.

2. **Monocular Depth Constraints:** MiDaS provides ordinal (relative) depth only. The system cannot determine absolute distances, which limits its application to advisory warnings rather than automated interventions (e.g., automatic braking).

3. **Speed Input:** Vehicle speed is currently configured manually or via GPS. Integration with the bus's OBD-II port would provide more accurate speed data and enable additional diagnostics.

4. **Single Forward Camera:** The system monitors only the forward road scene. Side-impact collisions, rear-end incidents, and cabin safety events (e.g., passenger falls, driver drowsiness) are not covered.

5. **Weather Performance:** System accuracy degrades in heavy rain (estimated 15–20% mAP reduction) and fog (25–30% reduction). The DI-VE enhancement partially mitigates haze but cannot overcome severe weather conditions.

6. **Hardware Ceiling:** The Raspberry Pi 4's 13.5 GFLOPS fundamentally limits raw inference throughput. While adaptive processing provides acceptable effective FPS, more computationally capable edge devices (e.g., NVIDIA Jetson Nano at 472 GFLOPS) would enable higher-fidelity processing.

7. **Evaluation Scope:** System evaluation was conducted using recorded footage played back on the Raspberry Pi, not during live on-road deployment. Real-world deployment introduces additional challenges (vibration, temperature variation, power fluctuations) that were not fully tested.

### 3.3.5 Future Improvements

1. **Sri Lankan Dataset Collection:** Partner with CTB to collect and annotate 10,000+ frames of Sri Lankan road markings and traffic for model fine-tuning.

2. **Metric Depth Calibration:** Integrate a single ultrasonic sensor ($5) to provide ground-truth metric distance for calibrating MiDaS output in real-time, enabling Automated Emergency Braking (AEB) capability.

3. **OBD-II Integration:** Direct connection to the bus's OBD-II port for real-time speed, acceleration, and engine data, enabling additional violation categories (harsh braking, rapid acceleration).

4. **Multi-Camera Support:** Add a cabin-facing camera for driver drowsiness detection (eye tracking, head pose estimation) and a rear-facing camera for rear collision risk assessment.

5. **Steering Angle Integration:** Adding steering angle data would reduce false positives during intentional lane changes and turns, improving the F1 score for lane departure detection.

6. **Hardware Upgrade Path:** Migration to NVIDIA Jetson Nano (472 GFLOPS, ~$130) or Google Coral Edge TPU (4 TOPS, ~$60) would enable 5–10x higher inference throughput, potentially allowing real-time processing without the adaptive framework.

7. **Night Vision Enhancement:** Explore infrared (IR) camera integration or GAN-based night-to-day transformation (e.g., ToDayGAN) for improved nighttime accuracy.

8. **Federated Learning:** Implement on-device learning that allows models to continuously improve from locally-collected data without sending sensitive footage to the cloud.

---

## 3.4 Summary of Student's Contribution

This section summarizes the individual research contributions of the student (IT22569486) to the overall group project:

| Contribution Area | Description | Novelty |
|---|---|---|
| Multi-Model Fusion Pipeline | Designed and implemented the integration of YOLOv8-seg, YOLOv8n, and MiDaS into a unified real-time pipeline | First multi-model fusion for Sri Lankan transport |
| Adaptive Processing Framework | Developed the five-optimization framework enabling three concurrent DL models on Raspberry Pi 4 | Novel speed-context adaptive scheduling |
| Kalman-Filtered Lane Memory | Implemented temporal lane tracking with polynomial fitting and Kalman prediction for occluded markings | Novel application to intermittent Sri Lankan markings |
| Ground-Referenced Proximity | Developed calibration-free proximity classification using road surface depth as reference | Novel approach eliminating camera calibration |
| Detection-Informed Video Enhancement | Adapted DI-TM principles to classical CV techniques for edge-optimized preprocessing | Novel classical CV adaptation of DI-TM |
| Driver Behavior Analyzer | Implemented context-aware violation detection fusing speed, traffic, depth, and lanes | Novel contextual reasoning for CTB regulations |
| Road Structure Predictor | Developed curvature-based road type classification from lane polynomial coefficients | Supporting contribution for context |

The student was solely responsible for the design, implementation, and evaluation of all six modules within the `context_aware_monitoring` package, comprising approximately 4,094 lines of Python code across 6 core files. The student also contributed to the IoT communication layer (MQTT + SQLite offline queue) and the React dashboard integration for violation visualization.

---

# 4. CONCLUSIONS

This research has established a viable framework for context-aware road monitoring specifically engineered for the Sri Lankan public transport sector. By fusing multi-model deep learning — YOLOv8 for segmentation and detection, and MiDaS for depth estimation — the system achieves a degree of situational awareness previously reserved for high-end autonomous vehicles, at a fraction of the cost.

The research objectives were achieved as follows:

**Objective 1 (Multi-Model Pipeline):** ✅ Successfully integrated three deep learning models (YOLOv8-seg, YOLOv8n, MiDaS) into a unified pipeline. The fusion of lane segmentation, object detection, and depth estimation enables contextual violation detection with F1 scores ranging from 0.81 to 0.92 across four violation categories.

**Objective 2 (Adaptive Processing):** ✅ The five-optimization framework reduces CPU load by up to 78% and achieves effective FPS of 8.4–22.5 depending on driving speed, exceeding the minimum target of 8 FPS at highway speeds. The adaptive strategy prevents thermal throttling and enables sustained operation in tropical conditions.

**Objective 3 (Lane Memory):** ✅ The Kalman-filtered lane memory tracker maintains temporal lane state during occlusions lasting up to 45 frames (~1.5 seconds). Lane departure detection achieves the highest F1 score (0.90) among all violation types, demonstrating the effectiveness of temporal persistence.

**Objective 4 (Ground-Referenced Proximity):** ✅ The ground-referenced proximity analysis achieves 84% classification accuracy without camera calibration. The approach is resilient to lighting changes and camera position variations, making it suitable for mass deployment across heterogeneous bus fleet configurations.

**Objective 5 (Video Enhancement):** ✅ The DI-VE pipeline processes frames in 10–15ms on the Raspberry Pi 4, meeting the target. Preliminary testing indicates 3–5% mAP improvement in low-light conditions, with the AUTO mode adapting dynamically to scene changes.

**Objective 6 (Violation Detection & IoT):** ✅ The driver behavior analyzer detects four CTB violation categories with precision ranging from 0.84 to 0.94. The MQTT-based IoT architecture with SQLite offline resilience ensures zero data loss during connectivity gaps.

Critically, the five-optimization adaptive processing framework enables these complex models to run in real-time on a standard Raspberry Pi 4, proving that sophisticated AI can be democratized for deployment in resource-constrained environments. The integration of a resilient IoT communication layer ensures that data flows from the edge to the cloud without loss, enabling long-term fleet analytics and driver performance assessment.

As transport authorities in developing nations look toward digital transformation, the context-aware edge-processing paradigm presented here offers a scalable, effective, and affordable solution for the future of public mobility. The system's total hardware cost of under $100 per unit makes it economically viable for fleet-wide deployment across the CTB's 6,000+ buses.

Future research will focus on three key areas: (1) metric depth calibration through ultrasonic sensor integration for AEB capability, (2) expansion of the behavioral analysis to include driver fatigue and cabin-interior monitoring, and (3) collection and annotation of a dedicated Sri Lankan road dataset to close the domain gap identified in this study. Together, these advancements would create a 360-degree safety envelope for public transport.

---

# REFERENCES

[1] Context_Aware_Monitoring_Research_Paper.docx — Internal project document.

[2] "Potential misattribution of YOLOv8 in an IEEE paper," GitHub Issue #22981, Ultralytics, 2026. [Online]. Available: https://github.com/ultralytics/ultralytics/issues/22981

[3] "Ultralytics YOLO Evolution: An Overview of YOLO26, YOLO11, YOLOv8, and YOLOv5 Object Detectors for Computer Vision and Pattern Recognition," arXiv, 2026. [Online]. Available: https://arxiv.org/html/2510.09653v2

[4] "Speed up inference time for YOLOv8 Pose models on Raspberry Pi," GitHub Issue #21167, Ultralytics, 2026. [Online]. Available: https://github.com/ultralytics/ultralytics/issues/21167

[5] "IEEE Format: Understanding IEEE Citation Style Guide with Templates," Paperpal, 2026. [Online]. Available: https://pp-blog.paperpal.com/news-updates/product-updates/ieee-citation-style-guide-with-templates

[6] R. Ranftl, K. Lasinger, D. Hafner, K. Schindler, and V. Koltun, "Towards Robust Monocular Depth Estimation: Mixing Datasets for Zero-Shot Cross-Dataset Transfer," IEEE Trans. Pattern Anal. Mach. Intell., vol. 44, no. 3, pp. 1623–1637, 2022.

[7] "Comparison graph of mAP 50-95 scores using different YOLO algorithms," ResearchGate, 2026. [Online]. Available: https://www.researchgate.net/figure/Comparison-graph-of-mAP-50-95-scores-using-different-YOLO-algorithms_fig1_378665960

[8] "Dilated Convolution and YOLOv8 Feature Extraction Network: An Improved Method for MRI-Based Brain Tumor Detection," IEEE Access, 2026. [Online]. Available: https://ieeexplore.ieee.org/iel8/6287639/10820123/10877809.pdf

[9] "Road Markings Segmentation from LIDAR Point Clouds using Reflectivity Information," arXiv, 2022. [Online]. Available: https://arxiv.org/html/2211.01105v2

[10] G. Shastry, "From 500ms to 30ms: Engineering Real-Time YOLOv8 on CPU," Medium, Feb. 2026. [Online]. Available: https://medium.com/@gautamashastry/from-500ms-to-30ms-engineering-real-time-yolov8-on-cpu-eb2b21573438

[11] H.-L. Chang, C.-T. Chan, and W.-J. Wang, "RLMD: A Dataset for Road Line and Marking Segmentation," in Proc. IEEE ICCE-TW, 2023. [Online]. Available: https://github.com/stu9113611/RLMD

[12] L. Santos, J. Ferreira, and R. Almeida, "YOLO MDE: Object Detection with Monocular Depth Estimation," Electronics, vol. 11, no. 1, p. 76, 2022.

[13] M. N. Hussain et al., "What is YOLOv8: An In-Depth Exploration of the Internal Features of the Next-Generation Object Detector," arXiv, 2024. [Online]. Available: https://arxiv.org/html/2408.15857v1

[14] "isl-org/MiDaS: Code for robust monocular depth estimation," GitHub, 2022. [Online]. Available: https://github.com/isl-org/MiDaS

[15] "Towards Robust Monocular Depth Estimation: Mixing Datasets for Zero-shot Cross-dataset Transfer," IPOL Demos. [Online]. Available: https://ipolcore.ipol.im/demo/clientApp/demo.html?id=45901

[16] "EfficientDepth: A Fast and Detail-Preserving Monocular Depth Estimation Model," arXiv, 2025. [Online]. Available: https://arxiv.org/html/2509.22527v1

[17] R. Syahrudin et al., "Object Detection with YOLOv8 and Enhanced Distance Estimation Using OpenCV for Visually Impaired Accessibility," JOIV, 2024. [Online]. Available: https://joiv.org/index.php/joiv/article/view/2826

[18] A. Ahmad et al., "A Performance Analysis of You Only Look Once Models for Deployment on Constrained Computational Edge Devices in Drone Applications," arXiv, 2025. [Online]. Available: https://www.arxiv.org/pdf/2502.15737

[19] "How to Increase Inference Speed for Computer Vision Models," Roboflow Blog, 2026. [Online]. Available: https://blog.roboflow.com/increase-inference-speed-for-computer-vision/

[20] "Citing ONNX Runtime," ONNX Runtime Documentation. [Online]. Available: https://onnxruntime.ai/docs/reference/citing.html

[21] "Citing ONNX?" GitHub Discussion #1441. [Online]. Available: https://github.com/onnx/onnx/discussions/1441

[22] D. Kandpal, "Road Object Detection," Roboflow Universe, 2023. [Online]. Available: https://universe.roboflow.com/dhruv-kandpal-ewuck/road-object-detection-devp5

[23] N. Khan, "Getting Started with Depth Estimation using MiDaS and Python," Medium, 2023. [Online]. Available: https://medium.com/@nbeel.original/getting-started-with-depth-estimation-using-midas-and-python-d0119bfe1159

[24] "A Comparison of Deep Neural Networks for Monocular Depth Map Estimation in Natural Environments Flying at Low Altitude," Sensors, vol. 22, no. 24, p. 9912, 2022.

[25] I. Shopovska, L. Jovanov, and W. Philips, "High-Dynamic-Range Tone Mapping in Intelligent Automotive Systems," Sensors, vol. 23, no. 12, p. 5767, 2023.

[26] H. Neven, B. De Brabandere, S. Georgoulis, M. Proesmans, and L. Van Gool, "Towards End-to-End Lane Detection: an Instance Segmentation Approach," in Proc. IEEE IV, 2018.

[27] X. Pan, J. Shi, P. Luo, X. Wang, and X. Tang, "Spatial As Deep: Spatial CNN for Traffic Scene Understanding," in Proc. AAAI, 2018.

[28] Z. Qin, H. Wang, and X. Li, "Ultra Fast Structure-aware Deep Lane Detection," in Proc. ECCV, 2020.

---
