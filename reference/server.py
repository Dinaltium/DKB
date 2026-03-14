import logging
import os
import random
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="BusConnect API")
api_router = APIRouter(prefix="/api")


class StopInfo(BaseModel):
    name: str
    lat: float
    lng: float


class CrowdVotes(BaseModel):
    on_time: int = 0
    slightly_late: int = 0
    very_late: int = 0


class FareRow(BaseModel):
    stop: str
    fare: int


class BusSummary(BaseModel):
    bus_number: str
    origin: str
    destination: str
    driver_name: str
    conductor_name: str
    status: Literal["Running", "Not Running", "Delayed"]
    available_seats: int
    women_reserved_available: int
    women_reserved_total: int
    full_fare: int
    next_departure: Optional[str] = None


class BusDetailResponse(BaseModel):
    bus_number: str
    license_plate: str
    operator_id: str
    operator_name: str
    origin: str
    destination: str
    route_stops: List[StopInfo]
    full_fare: int
    fare_table: List[FareRow]
    driver_name: str
    conductor_name: str
    status: Literal["Running", "Not Running", "Delayed"]
    schedule: List[str]
    crowd_votes: CrowdVotes
    women_reserved_total: int
    women_reserved_available: int
    student_card_accepted: bool
    student_discount_percent: int
    available_seats: int
    total_seats: int
    status_note: str = "Timings are approximate. Delays are common."


class RouteSearchResult(BaseModel):
    bus_number: str
    origin: str
    destination: str
    departure_time: str
    fare: int
    available_seats: int
    status: Literal["Running", "Not Running", "Delayed"]
    operator_name: str


class CrowdVoteRequest(BaseModel):
    status: Literal["on_time", "slightly_late", "very_late"]


class PaymentRequest(BaseModel):
    bus_number: str
    amount: int
    payer_name: str = "Guest User"
    upi_id: str
    force_result: Optional[Literal["success", "failed"]] = None


class PaymentResponse(BaseModel):
    transaction_id: str
    bus_number: str
    amount: int
    status: Literal["success", "failed"]
    message: str


class ComplaintCreate(BaseModel):
    bus_number: str
    category: Literal[
        "Overcharging",
        "Wrong Route",
        "Harassment",
        "Reckless Driving",
        "Other",
    ]
    description: str
    photo_name: Optional[str] = None


class ComplaintResponse(BaseModel):
    complaint_id: str
    message: str


class ComplaintItem(BaseModel):
    complaint_id: str
    bus_number: str
    category: str
    description: str
    photo_name: Optional[str] = None
    created_at: str


class OperatorItem(BaseModel):
    operator_id: str
    name: str
    approved: bool


class BusStatusUpdate(BaseModel):
    status: Literal["Running", "Not Running", "Delayed"]


class OperatorStats(BaseModel):
    daily_trips: int
    payment_transactions: int


class OperatorDashboard(BaseModel):
    operator: OperatorItem
    buses: List[BusSummary]
    complaints: List[ComplaintItem]
    stats: OperatorStats


class AdminOverview(BaseModel):
    buses: List[BusSummary]
    operators: List[OperatorItem]
    complaints: List[ComplaintItem]


class OperatorApprovalUpdate(BaseModel):
    approved: bool


STOP_COORDS = {
    "Mangalore Central": {"lat": 12.9141, "lng": 74.8560},
    "Hampankatta": {"lat": 12.8704, "lng": 74.8429},
    "Surathkal": {"lat": 13.0089, "lng": 74.7943},
    "Mulki": {"lat": 13.0916, "lng": 74.7932},
    "Padubidri": {"lat": 13.1708, "lng": 74.7727},
    "Brahmavar": {"lat": 13.2518, "lng": 74.7464},
    "Udupi": {"lat": 13.3409, "lng": 74.7421},
    "Manipal": {"lat": 13.3523, "lng": 74.7860},
    "Karkala": {"lat": 13.2140, "lng": 74.9923},
}


def stop_sequence_to_geo(stops: List[str]) -> List[dict]:
    return [
        {
            "name": name,
            "lat": STOP_COORDS[name]["lat"],
            "lng": STOP_COORDS[name]["lng"],
        }
        for name in stops
    ]


def calculate_fare(route_stops: List[str], full_fare: int, start: str, end: str) -> int:
    if start not in route_stops or end not in route_stops:
        return 0
    start_idx = route_stops.index(start)
    end_idx = route_stops.index(end)
    distance_steps = abs(end_idx - start_idx)
    total_steps = max(len(route_stops) - 1, 1)
    if distance_steps == 0:
        return 0
    proportional = round((distance_steps / total_steps) * full_fare)
    return max(5, proportional)


def build_fare_table(route_stops: List[str], full_fare: int, current_stop: str) -> List[dict]:
    return [
        {"stop": stop, "fare": calculate_fare(route_stops, full_fare, current_stop, stop)}
        for stop in route_stops
    ]


def pick_departure(schedule: List[str], time_filter: Optional[str]) -> str:
    if not time_filter:
        return schedule[0]
    try:
        filter_obj = datetime.strptime(time_filter, "%H:%M")
    except ValueError:
        return schedule[0]

    for slot in schedule:
        slot_obj = datetime.strptime(slot, "%H:%M")
        if slot_obj >= filter_obj:
            return slot
    return schedule[0]


async def seed_data() -> None:
    operators_seed = [
        {"operator_id": "op-coastal", "name": "Coastal Rider Pvt Ltd", "approved": True},
        {"operator_id": "op-dk", "name": "DK Connect Lines", "approved": True},
        {"operator_id": "op-new", "name": "Malpe Mobility", "approved": False},
    ]

    buses_seed = [
        {
            "bus_number": "MNG-101",
            "license_plate": "KA-19-AB-1101",
            "operator_id": "op-coastal",
            "operator_name": "Coastal Rider Pvt Ltd",
            "origin": "Mangalore Central",
            "destination": "Udupi",
            "route_stops": stop_sequence_to_geo(
                [
                    "Mangalore Central",
                    "Hampankatta",
                    "Surathkal",
                    "Mulki",
                    "Padubidri",
                    "Brahmavar",
                    "Udupi",
                ]
            ),
            "full_fare": 35,
            "driver_name": "Raju Shetty",
            "conductor_name": "Mohan Nayak",
            "status": "Running",
            "schedule": ["06:30", "08:00", "10:15", "13:00", "16:30", "19:00"],
            "crowd_votes": {"on_time": 24, "slightly_late": 8, "very_late": 2},
            "women_reserved_total": 8,
            "women_reserved_available": 5,
            "student_card_accepted": True,
            "student_discount_percent": 30,
            "available_seats": 21,
            "total_seats": 44,
            "daily_trips": 10,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "bus_number": "MNG-205",
            "license_plate": "KA-19-AC-2205",
            "operator_id": "op-coastal",
            "operator_name": "Coastal Rider Pvt Ltd",
            "origin": "Mangalore Central",
            "destination": "Manipal",
            "route_stops": stop_sequence_to_geo(
                [
                    "Mangalore Central",
                    "Hampankatta",
                    "Surathkal",
                    "Mulki",
                    "Padubidri",
                    "Udupi",
                    "Manipal",
                ]
            ),
            "full_fare": 45,
            "driver_name": "Suresh Kumar",
            "conductor_name": "Anand Rao",
            "status": "Running",
            "schedule": ["07:00", "09:30", "12:15", "15:00", "18:20"],
            "crowd_votes": {"on_time": 11, "slightly_late": 5, "very_late": 1},
            "women_reserved_total": 6,
            "women_reserved_available": 3,
            "student_card_accepted": True,
            "student_discount_percent": 25,
            "available_seats": 14,
            "total_seats": 40,
            "daily_trips": 8,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "bus_number": "UDU-310",
            "license_plate": "KA-20-BD-3310",
            "operator_id": "op-dk",
            "operator_name": "DK Connect Lines",
            "origin": "Udupi",
            "destination": "Mangalore Central",
            "route_stops": stop_sequence_to_geo(
                ["Udupi", "Padubidri", "Surathkal", "Mangalore Central"]
            ),
            "full_fare": 40,
            "driver_name": "Prakash Gowda",
            "conductor_name": "Nitin Poojary",
            "status": "Delayed",
            "schedule": ["06:45", "09:10", "11:45", "14:30", "17:40"],
            "crowd_votes": {"on_time": 6, "slightly_late": 7, "very_late": 3},
            "women_reserved_total": 8,
            "women_reserved_available": 4,
            "student_card_accepted": False,
            "student_discount_percent": 0,
            "available_seats": 18,
            "total_seats": 46,
            "daily_trips": 7,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    ]

    for operator in operators_seed:
        await db.operators.update_one(
            {"operator_id": operator["operator_id"]},
            {"$set": operator},
            upsert=True,
        )

    for bus in buses_seed:
        await db.buses.update_one(
            {"bus_number": bus["bus_number"]},
            {"$set": bus},
            upsert=True,
        )


@app.on_event("startup")
async def startup_event() -> None:
    await seed_data()


@api_router.get("/")
async def root():
    return {"message": "BusConnect API is running"}


@api_router.get("/stops", response_model=List[StopInfo])
async def get_stops():
    return [
        {"name": name, "lat": value["lat"], "lng": value["lng"]}
        for name, value in STOP_COORDS.items()
    ]


@api_router.get("/buses", response_model=List[BusSummary])
async def get_buses():
    buses = await db.buses.find({}, {"_id": 0}).to_list(200)
    result = []
    for bus in buses:
        result.append(
            {
                "bus_number": bus["bus_number"],
                "origin": bus["origin"],
                "destination": bus["destination"],
                "driver_name": bus["driver_name"],
                "conductor_name": bus["conductor_name"],
                "status": bus["status"],
                "available_seats": bus["available_seats"],
                "women_reserved_available": bus["women_reserved_available"],
                "women_reserved_total": bus["women_reserved_total"],
                "full_fare": bus["full_fare"],
                "next_departure": bus["schedule"][0],
            }
        )
    return result


@api_router.get("/routes/search", response_model=List[RouteSearchResult])
async def search_routes(
    origin: str = Query(...),
    destination: str = Query(...),
    time: Optional[str] = Query(default=None),
    max_fare: Optional[int] = Query(default=None),
    min_seats: int = Query(default=0),
):
    buses = await db.buses.find({}, {"_id": 0}).to_list(200)
    matches = []

    for bus in buses:
        route_names = [stop["name"] for stop in bus["route_stops"]]
        if origin not in route_names or destination not in route_names:
            continue

        if route_names.index(origin) >= route_names.index(destination):
            continue

        fare = calculate_fare(route_names, bus["full_fare"], origin, destination)
        if max_fare is not None and fare > max_fare:
            continue
        if bus["available_seats"] < min_seats:
            continue

        departure_time = pick_departure(bus["schedule"], time)
        matches.append(
            {
                "bus_number": bus["bus_number"],
                "origin": origin,
                "destination": destination,
                "departure_time": departure_time,
                "fare": fare,
                "available_seats": bus["available_seats"],
                "status": bus["status"],
                "operator_name": bus["operator_name"],
            }
        )

    return sorted(matches, key=lambda x: x["departure_time"])


@api_router.get("/buses/{bus_number}", response_model=BusDetailResponse)
async def get_bus_detail(bus_number: str, current_stop: Optional[str] = Query(default=None)):
    bus = await db.buses.find_one({"bus_number": bus_number}, {"_id": 0})
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    route_names = [stop["name"] for stop in bus["route_stops"]]
    resolved_current_stop = current_stop if current_stop in route_names else route_names[0]

    return {
        "bus_number": bus["bus_number"],
        "license_plate": bus["license_plate"],
        "operator_id": bus["operator_id"],
        "operator_name": bus["operator_name"],
        "origin": bus["origin"],
        "destination": bus["destination"],
        "route_stops": bus["route_stops"],
        "full_fare": bus["full_fare"],
        "fare_table": build_fare_table(route_names, bus["full_fare"], resolved_current_stop),
        "driver_name": bus["driver_name"],
        "conductor_name": bus["conductor_name"],
        "status": bus["status"],
        "schedule": bus["schedule"],
        "crowd_votes": bus["crowd_votes"],
        "women_reserved_total": bus["women_reserved_total"],
        "women_reserved_available": bus["women_reserved_available"],
        "student_card_accepted": bus["student_card_accepted"],
        "student_discount_percent": bus["student_discount_percent"],
        "available_seats": bus["available_seats"],
        "total_seats": bus["total_seats"],
        "status_note": "Timings are approximate. Delays are common.",
    }


@api_router.post("/buses/{bus_number}/crowd-vote", response_model=CrowdVotes)
async def crowd_vote(bus_number: str, payload: CrowdVoteRequest):
    bus = await db.buses.find_one({"bus_number": bus_number}, {"_id": 0})
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    votes = bus.get("crowd_votes", {"on_time": 0, "slightly_late": 0, "very_late": 0})
    votes[payload.status] = votes.get(payload.status, 0) + 1

    await db.buses.update_one(
        {"bus_number": bus_number},
        {
            "$set": {
                "crowd_votes": votes,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return votes


@api_router.post("/payments/mock", response_model=PaymentResponse)
async def mock_payment(payload: PaymentRequest):
    bus = await db.buses.find_one({"bus_number": payload.bus_number}, {"_id": 0})
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    success = (
        payload.force_result == "success"
        if payload.force_result
        else random.random() >= 0.2
    )
    status = "success" if success else "failed"
    transaction_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"

    payment_doc = {
        "transaction_id": transaction_id,
        "bus_number": payload.bus_number,
        "operator_id": bus["operator_id"],
        "amount": payload.amount,
        "status": status,
        "payer_name": payload.payer_name,
        "upi_id": payload.upi_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payments.insert_one(payment_doc.copy())

    return {
        "transaction_id": transaction_id,
        "bus_number": payload.bus_number,
        "amount": payload.amount,
        "status": status,
        "message": "Payment completed" if success else "Payment failed. Please retry.",
    }


@api_router.post("/complaints", response_model=ComplaintResponse)
async def create_complaint(payload: ComplaintCreate):
    bus = await db.buses.find_one({"bus_number": payload.bus_number}, {"_id": 0})
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    complaint_id = f"CMP-{uuid.uuid4().hex[:8].upper()}"
    complaint_doc = {
        "complaint_id": complaint_id,
        "bus_number": payload.bus_number,
        "operator_id": bus["operator_id"],
        "category": payload.category,
        "description": payload.description,
        "photo_name": payload.photo_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.complaints.insert_one(complaint_doc.copy())
    return {"complaint_id": complaint_id, "message": "Complaint submitted successfully"}


@api_router.get("/complaints", response_model=List[ComplaintItem])
async def get_complaints(bus_number: Optional[str] = Query(default=None)):
    query = {"bus_number": bus_number} if bus_number else {}
    complaints = await db.complaints.find(query, {"_id": 0}).sort("created_at", -1).to_list(300)
    return complaints


@api_router.get("/operators", response_model=List[OperatorItem])
async def get_operators():
    operators = await db.operators.find({}, {"_id": 0}).to_list(200)
    return operators


@api_router.get("/operators/{operator_id}/dashboard", response_model=OperatorDashboard)
async def get_operator_dashboard(operator_id: str):
    operator = await db.operators.find_one({"operator_id": operator_id}, {"_id": 0})
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")

    buses = await db.buses.find({"operator_id": operator_id}, {"_id": 0}).to_list(200)
    bus_numbers = [bus["bus_number"] for bus in buses]
    complaints = await db.complaints.find(
        {"bus_number": {"$in": bus_numbers}}, {"_id": 0}
    ).sort("created_at", -1).to_list(300)

    bus_summaries = [
        {
            "bus_number": bus["bus_number"],
            "origin": bus["origin"],
            "destination": bus["destination"],
            "driver_name": bus["driver_name"],
            "conductor_name": bus["conductor_name"],
            "status": bus["status"],
            "available_seats": bus["available_seats"],
            "women_reserved_available": bus["women_reserved_available"],
            "women_reserved_total": bus["women_reserved_total"],
            "full_fare": bus["full_fare"],
            "next_departure": bus["schedule"][0],
        }
        for bus in buses
    ]

    payments_count = await db.payments.count_documents({"operator_id": operator_id})
    total_trips = sum(bus.get("daily_trips", 0) for bus in buses)

    return {
        "operator": operator,
        "buses": bus_summaries,
        "complaints": complaints,
        "stats": {"daily_trips": total_trips, "payment_transactions": payments_count},
    }


@api_router.put("/operators/{operator_id}/buses/{bus_number}/status", response_model=BusSummary)
async def update_bus_status(operator_id: str, bus_number: str, payload: BusStatusUpdate):
    bus = await db.buses.find_one(
        {"operator_id": operator_id, "bus_number": bus_number}, {"_id": 0}
    )
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found for this operator")

    await db.buses.update_one(
        {"operator_id": operator_id, "bus_number": bus_number},
        {
            "$set": {
                "status": payload.status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    updated_bus = await db.buses.find_one(
        {"operator_id": operator_id, "bus_number": bus_number}, {"_id": 0}
    )
    return {
        "bus_number": updated_bus["bus_number"],
        "origin": updated_bus["origin"],
        "destination": updated_bus["destination"],
        "driver_name": updated_bus["driver_name"],
        "conductor_name": updated_bus["conductor_name"],
        "status": updated_bus["status"],
        "available_seats": updated_bus["available_seats"],
        "women_reserved_available": updated_bus["women_reserved_available"],
        "women_reserved_total": updated_bus["women_reserved_total"],
        "full_fare": updated_bus["full_fare"],
        "next_departure": updated_bus["schedule"][0],
    }


@api_router.get("/admin/overview", response_model=AdminOverview)
async def admin_overview():
    buses = await get_buses()
    operators = await get_operators()
    complaints = await get_complaints()
    return {"buses": buses, "operators": operators, "complaints": complaints}


@api_router.patch("/admin/operators/{operator_id}", response_model=OperatorItem)
async def update_operator_approval(operator_id: str, payload: OperatorApprovalUpdate):
    operator = await db.operators.find_one({"operator_id": operator_id}, {"_id": 0})
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")

    await db.operators.update_one(
        {"operator_id": operator_id}, {"$set": {"approved": payload.approved}}
    )
    updated = await db.operators.find_one({"operator_id": operator_id}, {"_id": 0})
    return updated


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()