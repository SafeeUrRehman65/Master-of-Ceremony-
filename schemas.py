from fastapi import WebSocket
from pydantic import BaseModel, Field
from typing import List, Literal


class SpeakerData(BaseModel):
    speaker_name:str=Field(default=None, description="The name of the speaker")
    designation: str = Field(default=None, description="The designation of the speaker")
    inspiration: str = Field(default = None, description = "What inspiration can one draw from the speaker")
    purpose_of_speech:str = Field(default=None, description='The purpose of the speech')
    script_of_speech:str = Field(default=None, description='The script of the speaker')

class SpeakerName(BaseModel):
    speaker_name:str = Field(default = None, description = "The name of the speaker")

class Script(BaseModel):
    """Important details and script of the ceremony"""

    event_name:str = Field(default = None, description='The name of the event')
    theme:str = Field(default = None, description='The theme of the event')
    venue:str = Field(default = None, description='The venue of the event')
    time:str = Field(default = "06:00 PM", description="The starting time of the event")
    purpose:str = Field(default = None, description="The purpose/ significance of the event")
    speakers_names: List[SpeakerName]
    speakers_data: List[SpeakerData]



# initialize state for MoC agent
class State(BaseModel):
    # this state class will hold important information about the ceremony needed for the MoC agent to work smoothly
    websocket: WebSocket
    event_name:str 
    theme:str
    venue:str
    time:str
    purpose:str
    current_speaker_id: int
    speakers_names: List
    speakers_data: List
    phase: Literal["prepare", "initiate", "listen", "speeches", "remarks" "end"]