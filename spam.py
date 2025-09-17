current_time = time.time()

            #generate a remark/acknowledgement every 1 min
            if current_time - last_invoke_time >= 60:
                speaker_speech_partial = new_client.state

                response = chain.invoke({"speaker_name": current_speaker_data["speaker_name"], "speaker_designation": current_speaker_data["speaker_designation"], "purpose_of_speech": current_speaker_data["purpose_of_speech"], "script_of_speech": speaker_speech_partial}) 

                # update the last invoke time
                last_invoke_time = current_time

                print("Speaker remarks & end of speech detection:", {response})
                if response.end_of_speech:
                    # speech has ended, introduce new speaker if any or conclude
                    print(f"✅ Speech ended of speaker {state.current_speaker_id}, providing acknowledgements and remarks.")
                    update = {
                        "current_speaker_remarks" : response.remarks
                    }
                    new_client.fireworks_ws.close()
                    new_client.close()
                    return update
                else:
                    print(f"🎤 Speech in progress. Continuing....")
                    continue