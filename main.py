import os
from datetime import date
import threading
from queue import Queue
from typing import List
from langchain.output_parsers import PydanticOutputParser
from fastapi import FastAPI, WebSocket, WebSocketException
from utils.helperFunctios import text_to_speech 
from langchain_core.prompts import format_document
from pydantic import BaseModel, Field
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from context.texts import ceremony_script
from classes.transcriptionClient import TranscriptionClient
from prompts import ceremony_initiater_prompt, speaker_introduction_prompt
from dotenv import load_dotenv
from langchain.prompts import ChatPromptTemplate
from langchain_fireworks import ChatFireworks
from schemas import Script, State

load_dotenv()
system_message = """
You are a Master of Ceremony host and your name is Musa, your purpose is to host, conduct and manage any ceremony, event or exhibition.

**CAPABILITIES**
- You can speak in friendly, announcer-style tone.
- You can grasp the essence and nature of the speech very well and provide relevant, positive and complementary remarks.

**WORKFLOW**
- You start of the ceremony by introducing youself in 1 - 2 sentences.
- You tell the audience about the event, its purpose and importance.
- You intoduce the speakers, call them on stage and listen to their speech.
- Provide remarks after the speaker's speech has ended.
- You call the next speaker (if any) otherwise you conclude the event in a beautiful and professional way.

**IMPORTANT** 
- DO NOT Hallucinate or make up any information. 
"""

llm = ChatFireworks(
    api_key = os.getenv("FIREWORKS_API_KEY"),
    temperature=0,
    model="accounts/fireworks/models/kimi-k2-instruct-0905",
)


# parser = PydanticOutputParser(pydantic_object= Script)

# prompt = ChatPromptTemplate.from_messages(
#     [
#         ("system", "Format the user provided text in `json` tags \n{format_instructions}"),
#     ("human", "{script_text}"),
#     ]
# ).partial(format_instructions = parser.get_format_instructions())


# bind llm with structured output for extracting information from script
llm_with_structured_output = llm.with_structured_output(schema=Script)

# Nodes

# start the ceremony
def read_script(state: State):
    """Read the script and produce structured outputs"""
    response = llm_with_structured_output.invoke(ceremony_script)
    updated_message = {
        "event_name" : response.event_name,
        'theme' : response.theme,
        'venue' : response.venue,
        'time' : response.time,
        'purpose' : response.purpose,
        'speakers_names' : response.speakers_names,
        'speakers_data' : response.speakers_data,
    }
    return updated_message

def initiate_ceremony(state: State):
    prompt = ChatPromptTemplate.from_messages = ([
        ("system", ceremony_initiater_prompt),
    ])
    chain = prompt | llm
    response = chain.invoke({"event_name":state.event_name, "theme": state.theme, "venue": state.venue, "time": state.time, "purpose": state.purpose})
    audio_link = text_to_speech(response)
    # the audio playing logic
    # --------------------- 
    return {"phase": "initiate"}

def introduce_speaker(state: State):
    prompt = ChatPromptTemplate.from_messages = ([
        ("system", speaker_introduction_prompt)
    ])
    chain = prompt | llm
    speaker_introduction = chain.invoke({"speaker_name": state.speakers_data[state.current_speaker_id]['speaker_name'], "speaker_designation": state.speakers_data[state.current_speaker_id]['speaker_designation'], "speaker_inspiration": state.speakers_data[state.current_speaker_id]["speaker_inspiration"], "purpose_of_speech": state.speakers_data[state.current_speaker_id]["purpose_of_speech"], "script_of_speech": state.speakers_data[state.current_speaker_id]["script_of_speech"]})
    state.current_speaker_id += 1
    audio_link = text_to_speech(speaker_introduction)
    # the audio playing logic
    #-----------------

async def listen_to_speaker(state: State):
    state.phase = "listen"
    speakers_script = state.speakers_data[state.current_speaker_id]["script_of_speech"]
    minutes_of_speech = 
    
    if state.websocket:
        # initiate a queue to store incoming audio chunks
        audio_queue = Queue()
        # initiate a new transcription client
        new_client = TranscriptionClient(state.websocket)
        
        # initiate a new client thread to stop prevent effect
        new_client_thread = threading.Thread(target=new_client.run, args=(audio_queue,), daemon=True)
        new_client_thread.start()
        while True:
            audio_chunk = await state.websocket.receive_bytes()
            # keep adding audio chunks to the audio queue
            audio_queue.put(audio_chunk)
            new_client.state





def give_remarks(state: State):


# def provide_remarks(state: State):
# speaker_name:str=Field(default=None, description="The name of the speaker")
#     designation: str = Field(default=None, description="The designation of the speaker")
#     inspiration: str = Field(default = None, description = "What inspiration can one draw from the speaker")
#     purpose_of_speech:str = Field(default=None, description='The purpose of the speech')
#     script_of_speech:str = Field(default=None, description='The script of the speaker')



agent_builder = StateGraph(State)

response = agent.invoke({
    'websocket':
    'event_name':" ",
    "phase": "prepare",
    'theme':" ",
    'venue':" ",
    "current_speaker_id": 0,
    'time':" ",
    'purpose':" ",
    'speakers_names': [],
    'speakers_data': [],
    })

print("Agent current state", response)


app=FastAPI()

@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
