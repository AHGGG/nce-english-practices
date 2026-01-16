# Multi-Context WebSocket

GET /v1/text-to-speech/{voice_id}/multi-stream-input

The Multi-Context Text-to-Speech WebSockets API allows for generating audio from text input
while managing multiple independent audio generation streams (contexts) over a single WebSocket connection.
This is useful for scenarios requiring concurrent or interleaved audio generations, such as dynamic
conversational AI applications.

Each context, identified by a context id, maintains its own state. You can send text to specific
contexts, flush them, or close them independently. A `close_socket` message can be used to terminate
the entire connection gracefully.

For more information on best practices for how to use this API, please see the [multi context websocket guide](/docs/cookbooks/multi-context-web-socket).


Reference: https://elevenlabs.io/docs/api-reference/text-to-speech/v-1-text-to-speech-voice-id-multi-stream-input

## AsyncAPI Specification

```yaml
asyncapi: 2.6.0
info:
  title: V 1 Text To Speech Voice Id Multi Stream Input
  version: >-
    subpackage_v1TextToSpeechVoiceIdMultiStreamInput.v1TextToSpeechVoiceIdMultiStreamInput
  description: >
    The Multi-Context Text-to-Speech WebSockets API allows for generating audio
    from text input

    while managing multiple independent audio generation streams (contexts) over
    a single WebSocket connection.

    This is useful for scenarios requiring concurrent or interleaved audio
    generations, such as dynamic

    conversational AI applications.


    Each context, identified by a context id, maintains its own state. You can
    send text to specific

    contexts, flush them, or close them independently. A `close_socket` message
    can be used to terminate

    the entire connection gracefully.


    For more information on best practices for how to use this API, please see
    the [multi context websocket
    guide](/docs/cookbooks/multi-context-web-socket).
channels:
  /v1/text-to-speech/{voice_id}/multi-stream-input:
    description: >
      The Multi-Context Text-to-Speech WebSockets API allows for generating
      audio from text input

      while managing multiple independent audio generation streams (contexts)
      over a single WebSocket connection.

      This is useful for scenarios requiring concurrent or interleaved audio
      generations, such as dynamic

      conversational AI applications.


      Each context, identified by a context id, maintains its own state. You can
      send text to specific

      contexts, flush them, or close them independently. A `close_socket`
      message can be used to terminate

      the entire connection gracefully.


      For more information on best practices for how to use this API, please see
      the [multi context websocket
      guide](/docs/cookbooks/multi-context-web-socket).
    parameters:
      voice_id:
        description: The unique identifier for the voice to use in the TTS process.
        schema:
          type: string
    bindings:
      ws:
        query:
          type: object
          properties:
            authorization:
              type: string
            model_id:
              type: string
            language_code:
              type: string
            enable_logging:
              type: boolean
              default: true
            enable_ssml_parsing:
              type: boolean
              default: false
            output_format:
              $ref: '#/components/schemas/output_format'
            inactivity_timeout:
              type: integer
              default: 20
            sync_alignment:
              type: boolean
              default: false
            auto_mode:
              type: boolean
              default: false
            apply_text_normalization:
              $ref: '#/components/schemas/apply_text_normalization'
            seed:
              type: integer
        headers:
          type: object
          properties:
            xi-api-key:
              type: string
    publish:
      operationId: v-1-text-to-speech-voice-id-multi-stream-input-publish
      summary: subscribe
      description: Receive messages from the multi-context WebSocket.
      message:
        name: subscribe
        title: subscribe
        description: Receive messages from the multi-context WebSocket.
        payload:
          $ref: '#/components/schemas/V1TextToSpeechVoiceIdMultiStreamInputSubscribe'
    subscribe:
      operationId: v-1-text-to-speech-voice-id-multi-stream-input-subscribe
      summary: publish
      description: Send messages to the multi-context WebSocket.
      message:
        name: publish
        title: publish
        description: Send messages to the multi-context WebSocket.
        payload:
          $ref: '#/components/schemas/V1TextToSpeechVoiceIdMultiStreamInputPublish'
servers:
  Production:
    url: wss://api.elevenlabs.io/
    protocol: wss
    x-default: true
  Production US:
    url: wss://api.us.elevenlabs.io/
    protocol: wss
  Production EU:
    url: wss://api.eu.residency.elevenlabs.io/
    protocol: wss
  Production India:
    url: wss://api.in.residency.elevenlabs.io/
    protocol: wss
components:
  schemas:
    output_format:
      type: string
      enum:
        - value: mp3_22050_32
        - value: mp3_44100_32
        - value: mp3_44100_64
        - value: mp3_44100_96
        - value: mp3_44100_128
        - value: mp3_44100_192
        - value: pcm_8000
        - value: pcm_16000
        - value: pcm_22050
        - value: pcm_24000
        - value: pcm_44100
        - value: ulaw_8000
        - value: alaw_8000
        - value: opus_48000_32
        - value: opus_48000_64
        - value: opus_48000_96
        - value: opus_48000_128
        - value: opus_48000_192
    apply_text_normalization:
      type: string
      enum:
        - value: auto
        - value: 'on'
        - value: 'off'
      default: auto
    NormalizedAlignment:
      type: object
      properties:
        charStartTimesMs:
          type: array
          items:
            type: integer
          description: >
            A list of starting times (in milliseconds) for each character in the
            normalized text as it

            corresponds to the audio. For instance, the character 'H' starts at
            time 0 ms in the audio.

            Note these times are relative to the returned chunk from the model,
            and not the

            full audio response.
        charDurationsMs:
          type: array
          items:
            type: integer
          description: >
            A list of durations (in milliseconds) for each character in the
            normalized text as it

            corresponds to the audio. For instance, the character 'H' lasts for
            3 ms in the audio.

            Note these times are relative to the returned chunk from the model,
            and not the

            full audio response.
        chars:
          type: array
          items:
            type: string
          description: >
            A list of characters in the normalized text sequence. For instance,
            the first character is 'H'.

            Note that this list may contain spaces, punctuation, and other
            special characters.

            The length of this list should be the same as the lengths of
            `charStartTimesMs` and `charDurationsMs`.
    Alignment:
      type: object
      properties:
        charStartTimesMs:
          type: array
          items:
            type: integer
          description: >
            A list of starting times (in milliseconds) for each character in the
            text as it

            corresponds to the audio. For instance, the character 'H' starts at
            time 0 ms in the audio.

            Note these times are relative to the returned chunk from the model,
            and not the

            full audio response.
        charDurationsMs:
          type: array
          items:
            type: integer
          description: >
            A list of durations (in milliseconds) for each character in the text
            as it

            corresponds to the audio. For instance, the character 'H' lasts for
            3 ms in the audio.

            Note these times are relative to the returned chunk from the model,
            and not the

            full audio response.
        chars:
          type: array
          items:
            type: string
          description: >
            A list of characters in the text sequence. For instance, the first
            character is 'H'.

            Note that this list may contain spaces, punctuation, and other
            special characters.

            The length of this list should be the same as the lengths of
            `charStartTimesMs` and `charDurationsMs`.
    AudioOutputMulti:
      type: object
      properties:
        audio:
          type: string
          description: Base64 encoded audio chunk.
        normalizedAlignment:
          oneOf:
            - $ref: '#/components/schemas/NormalizedAlignment'
            - type: 'null'
        alignment:
          oneOf:
            - $ref: '#/components/schemas/Alignment'
            - type: 'null'
        contextId:
          type: string
          description: The contextId for which this audio is.
      required:
        - audio
    FinalOutputMulti:
      type: object
      properties:
        isFinal:
          type: string
          enum:
            - type: booleanLiteral
              value: true
          description: Indicates this is the final message for the context.
        contextId:
          type: string
          description: The context_id for which this is the final message.
      required:
        - isFinal
    V1TextToSpeechVoiceIdMultiStreamInputSubscribe:
      oneOf:
        - $ref: '#/components/schemas/AudioOutputMulti'
        - $ref: '#/components/schemas/FinalOutputMulti'
    RealtimeVoiceSettings:
      type: object
      properties:
        stability:
          type: number
          format: double
          default: 0.5
          description: Defines the stability for voice settings.
        similarity_boost:
          type: number
          format: double
          default: 0.75
          description: Defines the similarity boost for voice settings.
        style:
          type: number
          format: double
          default: 0
          description: >-
            Defines the style for voice settings. This parameter is available on
            V2+ models.
        use_speaker_boost:
          type: boolean
          default: true
          description: >-
            Defines the use speaker boost for voice settings. This parameter is
            available on V2+ models.
        speed:
          type: number
          format: double
          default: 1
          description: >-
            Controls the speed of the generated speech. Values range from 0.7 to
            1.2, with 1.0 being the default speed.
    GenerationConfig:
      type: object
      properties:
        chunk_length_schedule:
          type: array
          items:
            type: number
            format: double
          description: >
            This is an advanced setting that most users shouldn't need to use.
            It relates to our

            generation schedule.


            Our WebSocket service incorporates a buffer system designed to
            optimize the Time To First Byte (TTFB) while maintaining
            high-quality streaming.


            All text sent to the WebSocket endpoint is added to this buffer and
            only when that buffer reaches a certain size is an audio generation
            attempted. This is because our model provides higher quality audio
            when the model has longer inputs, and can deduce more context about
            how the text should be delivered.


            The buffer ensures smooth audio data delivery and is automatically
            emptied with a final audio generation either when the stream is
            closed, or upon sending a `flush` command. We have advanced settings
            for changing the chunk schedule, which can improve latency at the
            cost of quality by generating audio more frequently with smaller
            text inputs.


            The `chunk_length_schedule` determines the minimum amount of text
            that needs to be sent and present in our

            buffer before audio starts being generated. This is to maximise the
            amount of context available to

            the model to improve audio quality, whilst balancing latency of the
            returned audio chunks.


            The default value for `chunk_length_schedule` is: [120, 160, 250,
            290].


            This means that the first chunk of audio will not be generated until
            you send text that

            totals at least 120 characters long. The next chunk of audio will
            only be generated once a

            further 160 characters have been sent. The third audio chunk will be
            generated after the

            next 250 characters. Then the fourth, and beyond, will be generated
            in sets of at least 290 characters.


            Customize this array to suit your needs. If you want to generate
            audio more frequently

            to optimise latency, you can reduce the values in the array. Note
            that setting the values

            too low may result in lower quality audio. Please test and adjust as
            needed.


            Each item should be in the range 50-500.
    PronunciationDictionaryLocator:
      type: object
      properties:
        pronunciation_dictionary_id:
          type: string
          description: The unique identifier of the pronunciation dictionary
        version_id:
          type: string
          description: The version identifier of the pronunciation dictionary
      required:
        - pronunciation_dictionary_id
        - version_id
    InitializeConnectionMulti:
      type: object
      properties:
        text:
          type: string
          enum:
            - type: stringLiteral
              value: ' '
          description: Must be a single space character to initiate the context.
        voice_settings:
          $ref: '#/components/schemas/RealtimeVoiceSettings'
        generation_config:
          $ref: '#/components/schemas/GenerationConfig'
        pronunciation_dictionary_locators:
          type: array
          items:
            $ref: '#/components/schemas/PronunciationDictionaryLocator'
          description: Optional pronunciation dictionaries for this context.
        xi_api_key:
          type: string
          description: >-
            Your ElevenLabs API key (if not in header). For this context's first
            message only.
        authorization:
          type: string
          description: >-
            Your authorization bearer token (if not in header). For this
            context's first message only.
        context_id:
          type: string
          description: >-
            A unique identifier for the first context created in the websocket.
            If not provided, a default context will be used.
      required:
        - text
    InitialiseContext:
      type: object
      properties:
        text:
          type: string
          description: The initial text to synthesize. Should end with a single space.
        voice_settings:
          $ref: '#/components/schemas/RealtimeVoiceSettings'
        generation_config:
          $ref: '#/components/schemas/GenerationConfig'
        pronunciation_dictionary_locators:
          type: array
          items:
            $ref: '#/components/schemas/PronunciationDictionaryLocator'
          description: >-
            Optional list of pronunciation dictionary locators to be used for
            this context.
        xi_api_key:
          type: string
          description: >-
            Your ElevenLabs API key. Required if not provided in the WebSocket
            connection's header or query parameters. This applies to the
            (re)initialization of this specific context.
        authorization:
          type: string
          description: >-
            Your authorization bearer token. Required if not provided in the
            WebSocket connection's header or query parameters. This applies to
            the (re)initialization of this specific context.
        context_id:
          type: string
          description: >-
            An identifier for the text-to-speech context. If omitted, a default
            context ID may be assigned by the server. If provided, this message
            will create a new context with this ID or re-initialize an existing
            one with the new settings and text.
      required:
        - text
    SendTextMulti:
      type: object
      properties:
        text:
          type: string
          description: Text to synthesize. Should end with a single space.
        context_id:
          type: string
          description: The target context_id for this text.
        flush:
          type: boolean
          default: false
          description: >-
            If true, flushes the audio buffer for the specified context. If
            false, the text will be appended to the buffer to be generated.
      required:
        - text
    FlushContextClient:
      type: object
      properties:
        context_id:
          type: string
          description: The context_id to flush.
        text:
          type: string
          description: The text to append to the buffer to be flushed.
        flush:
          type: boolean
          default: false
          description: >-
            If true, flushes the audio buffer for the specified context. If
            false, the context will remain open and the text will be appended to
            the buffer to be generated.
      required:
        - context_id
        - flush
    CloseContextClient:
      type: object
      properties:
        context_id:
          type: string
          description: The context_id to close.
        close_context:
          type: boolean
          default: false
          description: >-
            Must set the close_context to true, to close the specified context.
            If false, the context will remain open and the text will be ignored.
            If set to true, the context will close. If it has already been set
            to flush it will continue flushing. The same context id can be used
            again but will not be linked to the previous context with the same
            name.
      required:
        - context_id
        - close_context
    CloseSocketClient:
      type: object
      properties:
        close_socket:
          type: boolean
          default: false
          description: >-
            If true, closes all contexts and closes the entire WebSocket
            connection. Any context that was previously set to flush will wait
            to flush before closing.
    KeepContextAlive:
      type: object
      properties:
        text:
          type: string
          enum:
            - type: stringLiteral
              value: ''
          description: >-
            An empty string. This text is ignored by the server but its presence
            resets the inactivity timeout for the specified context.
        context_id:
          type: string
          description: The identifier of the context to keep alive.
      required:
        - text
        - context_id
    V1TextToSpeechVoiceIdMultiStreamInputPublish:
      oneOf:
        - $ref: '#/components/schemas/InitializeConnectionMulti'
        - $ref: '#/components/schemas/InitialiseContext'
        - $ref: '#/components/schemas/SendTextMulti'
        - $ref: '#/components/schemas/FlushContextClient'
        - $ref: '#/components/schemas/CloseContextClient'
        - $ref: '#/components/schemas/CloseSocketClient'
        - $ref: '#/components/schemas/KeepContextAlive'

```