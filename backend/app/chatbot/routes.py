from fastapi import APIRouter

chatbot_router = APIRouter(
    tags=["Chatbot"]
)

@chatbot_router.get("/test")
def test_chatbot():
    return {"message": "Chatbot router working"}
