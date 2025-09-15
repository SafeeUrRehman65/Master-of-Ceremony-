import asyncio
import json
from math import e
import os
import threading
from queue import Queue
import time
from typing import List
from langchain.output_parsers import PydanticOutputParser
from fastapi import FastAPI, WebSocket, WebSocketException
from utils.helperFunctions import text_to_speech 
from langchain_core.prompts import format_document
from pydantic import BaseModel, Field
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from IPython.display import Image, display
from langgraph.types import Command
from context.texts import ceremony_script
from classes.transcriptionClient import TranscriptionClient
from prompts import ceremony_initiater_prompt, speaker_introduction_prompt, speaker_remark_prompt, ceremony_end_prompt
from textstat import textstat
from dotenv import load_dotenv
from langchain.prompts import ChatPromptTemplate
from langchain_fireworks import ChatFireworks
from schemas import Script, State, Remarks

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

# bind llm with structured output for extracting information from script
llm_with_structured_output = llm.with_structured_output(schema=Script)

# Nodes

# start the ceremony
def read_script(state: State):
    """Read the script and produce structured outputs"""
    state.phase = "prepare"
    response = llm_with_structured_output.invoke(ceremony_script)
    if (len(response.speakers_names) == 0 or len(response.speakers_data) == 0):
        print(f"🟥 There is no speakers data in the script so ending MoC agent")
        goto = END
        # pass empty_list as there is no speakers data in the script
        updated_message = {}
        return Command(goto = goto, update = updated_message)

    updated_message = {
        "event_name" : response.event_name,
        'theme' : response.theme,
        'venue' : response.venue,
        'time' : response.time,
        'purpose' : response.purpose,
        'speakers_names' : response.speakers_names,
        'speakers_data' : response.speakers_data,
    }
    print(f"Data extracted from the script: {updated_message}")
    return updated_message

async def initiate_ceremony(state: State):
    """Initiate the ceremony"""

    state.phase = "initiate"

    prompt = ChatPromptTemplate.from_messages([
        ("system", ceremony_initiater_prompt),
    ])
    
    chain = prompt | llm
    response = chain.invoke({"event_name": state.event_name, "theme": state.theme, "venue": state.venue, "time": state.time, "purpose": state.purpose})
    audio_url = text_to_speech(response)
    response_data = {
        "type": "audio_url",
        "phase": "initiate",
        "audio_url": audio_url
    }
    await state.websocket.send_text(json.dumps(response_data))
    while True:
        data = await state.websocket.receive_text()
        data = json.loads(data)
        if data:
            if data["audioFinished"] == True:
                return
            else:
                continue
        else:
            continue


async def introduce_speaker(state: State):
    """Introduces the speaker"""

    state.phase = "introduce"
    prompt = ChatPromptTemplate.from_messages([
        ("system", speaker_introduction_prompt)
    ])
    current_speaker_data = state.speakers_data[state.current_speaker_id]

    chain = prompt | llm
    speaker_introduction = chain.invoke({"speaker_name": current_speaker_data['speaker_name'], "speaker_designation": current_speaker_data['speaker_designation'], "speaker_inspiration": current_speaker_data["speaker_inspiration"], "purpose_of_speech": current_speaker_data["purpose_of_speech"], "script_of_speech": current_speaker_data["script_of_speech"]})


    audio_url = text_to_speech(speaker_introduction)
    response_data = {
        "type": "audio_url",
        "phase": "introduce",
        "audio_url": audio_url
    }
    # send audio_url to frontend
    await state.websocket.send_text(json.dumps(response_data))

    while True:
        data = await state.websocket.receive_text()
        data = json.loads(data)
        if data:
            if data["audioFinished"] == True:
                return
            else:
                continue
        else:
            continue


async def listen_to_speaker(state: State):
    """Listens to speaker and detects speech end after every 1 minute"""
    state.phase = "listen"

    prompt = ChatPromptTemplate.from_messages([
        ("system", speaker_remark_prompt)
    ])
    print(f'🎤 Now listening to speaker number {state.current_speaker_id}')

    current_speaker_data = state.speakers_data[state.current_speaker_id]
    speakers_script = current_speaker_data["script_of_speech"]

    minutes_of_script = textstat.reading_time(speakers_script, ms_per_char=14.69)
    minutes_of_script_rounded = round(minutes_of_script)

    print(f"{current_speaker_data['speaker_name']}'s script is {minutes_of_script_rounded} min long ")

    # remarks generation interval, after every quarter of time has passed
    # also convert to seconds
    # remark_generation_interval = (minutes_of_script_rounded / 4) * 60
    remarks_speech_detection_llm = llm.with_structured_output(schema = Remarks) 
    chain = prompt | remarks_speech_detection_llm
    if state.websocket:
        # initiate a queue to store incoming audio chunks
        audio_queue = Queue()
        
        # initiate a new transcription client
        new_client = TranscriptionClient(state.websocket)    
        # initiate a new client thread to stop prevent effect
        new_client_thread = threading.Thread(target=new_client.run, args=(audio_queue,), daemon=True)

        async def receive_audio_chunks(websocket, audio_queue):
            while True:
                audio_chunk = await websocket.receive_bytes()
                
                # keep adding audio chunks to the audio queue
                audio_queue.put(audio_chunk)

        new_client_thread.start()
        asyncio.create_task(receive_audio_chunks(state.websocket, audio_queue))
        last_invoke_time = 0
        while True:
            current_time = time.time()

            #generate a remark/acknowledgement every 1 min
            if current_time - last_invoke_time >= 60:
                speaker_speech_partial = new_client.state

                response = chain.invoke({"speaker_name":current_speaker_data["speaker_name"], "speaker_designation": current_speaker_data["speaker_designation"], "purpose_of_speech": current_speaker_data["purpose_of_speech"], "script_of_speech": speaker_speech_partial}) 

                # update the last invoke time
                last_invoke_time = current_time

                if response.end_of_speech:
                    # speech has ended, introduce new speaker if any or conclude
                    print(f"✅ Speech ended of speaker {state.current_speaker_id}, providing acknowledgements and remarks.")
                    update = {
                        "current_speaker_remarks" : response.remarks
                    }
                    new_client.fireworks_ws.close()
                    return update
                else:
                    print(f"🎤 Speech in progress. Continuing....")
                    continue
                    
async def give_remarks(state: State):
    """Play the given remarks and route to the correct node"""

    state.phase = "remarks"
    speaker_remarks = state.current_speaker_remarks
    try:
        if speaker_remarks:
            try:
                audio_url = text_to_speech(speaker_remarks)

            except Exception as e:
                print(f"Some error occured while generating speech: {e}")                
            response_data = {
                "type": "audio_url",
                "phase": "remarks",
                "audio_url": audio_url
            }
            await state.websocket.send_text(json.dumps(response_data))
            while True:
                data = await state.websocket.receive_text()
                data = json.loads(data)
                if data:
                    if data["audioFinished"] == True:
                        if ( (len(state.speakers_names) - 1 ) >= (state.current_speaker_id + 1)):
                            state.current_speaker_id +=1
                            print(f"Introduce the next speaker")
                            goto = "introduce_speaker"
                            return Command(goto = goto)
                        else:
                            print(f"All speeches delivered. End the ceremony")
                            goto = "end_ceremony"
                            return Command(goto = goto)
                    else:
                        continue
                else:
                    continue
            
        else:
            print("""Speaker remarks are empy.
            ❌ Cant play audio""")
    except Exception as error:
        print(f"Some error occured while sending audio url to frontend: {error}")


async def end_ceremony(state: State):
    """Provide graceful remarks to end ceremony"""
    
    state.phase = "end"
    prompt = ChatPromptTemplate.from_messages([
        ("system", ceremony_end_prompt)
    ])

    chain = prompt | llm

    ending_remarks = chain.invoke({"speakers_data": state.speakers_data, "event_name": state.event_name, "theme": state.theme, "venue": state.venue, "purpose":state.purpose})

    try :
        audio_url = text_to_speech(ending_remarks)

        response_data = {
            "type": "audio_url",
            "phase": "end",
            "audio_url": audio_url
        }

        await state.websocket.send_text(json.dumps(response_data))
        while True:
            data = await state.websocket.receive_text()
            data = json.loads(data)
            if data:
                if data["audioFinished"] == True:
                    goto = END
                    return Command(goto = goto)
                else:
                    continue
            else:
                continue
    except Exception as error:
        print(f"Some error ocurred: {error}")



graph_builder = StateGraph(State)

# orchestrate the workflow
graph_builder.add_node("read_script", read_script)
graph_builder.add_node("initiate_ceremony", initiate_ceremony)
graph_builder.add_node("introduce_speaker", introduce_speaker)
graph_builder.add_node("listen_to_speaker", listen_to_speaker)
graph_builder.add_node("give_remarks", give_remarks)
graph_builder.add_node("end_ceremony", end_ceremony)

graph_builder.add_edge(START, "read_script")
graph_builder.add_edge("read_script", "initiate_ceremony")
graph_builder.add_edge("initiate_ceremony", "introduce_speaker")
graph_builder.add_edge("introduce_speaker", "listen_to_speaker")
graph_builder.add_edge("listen_to_speaker", "give_remarks")

agent = graph_builder.compile()

app=FastAPI()

@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(f'✅ Connection established with frontend websocket successfully!')

    # visualize the graph
    try:
        display(Image(agent.get_graph().draw_mermaid_png()))
    except Exception:
        pass    
    response = agent.invoke({
        'websocket': websocket,
        'event_name':" ",
        'theme':" ",
        'venue':" ",
        'time':" ",
        'purpose':" ",
        "current_speaker_id": 0,
        'speakers_names': [],
        "current_speaker_remarks": " ",
        "ceremony_summary": " ",
        'speakers_data': [],
        "phase": " ",
        })
    
