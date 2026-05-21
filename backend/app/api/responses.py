from typing import Any

from fastapi.encoders import jsonable_encoder


def api_response(data: Any = None, message: str = "") -> dict[str, Any]:
    return {"success": True, "data": jsonable_encoder(data if data is not None else {}), "message": message}
