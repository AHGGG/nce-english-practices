# Get Studio Project

GET https://api.elevenlabs.io/v1/studio/projects/{project_id}

Returns information about a specific Studio project. This endpoint returns more detailed information about a project than `GET /v1/studio`.

Reference: https://elevenlabs.io/docs/api-reference/studio/get-project

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Studio Project
  version: endpoint_studio/projects.get
paths:
  /v1/studio/projects/{project_id}:
    get:
      operationId: get
      summary: Get Studio Project
      description: >-
        Returns information about a specific Studio project. This endpoint
        returns more detailed information about a project than `GET /v1/studio`.
      tags:
        - - subpackage_studio
          - subpackage_studio/projects
      parameters:
        - name: project_id
          in: path
          description: >-
            The ID of the project to be used. You can use the [List
            projects](/docs/api-reference/studio/get-projects) endpoint to list
            all the available projects.
          required: true
          schema:
            type: string
        - name: share_id
          in: query
          description: The share ID of the project
          required: false
          schema:
            type:
              - string
              - 'null'
        - name: xi-api-key
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectExtendedResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ProjectExtendedResponseModelTargetAudience:
      type: string
      enum:
        - value: children
        - value: young adult
        - value: adult
        - value: all ages
    ProjectState:
      type: string
      enum:
        - value: creating
        - value: default
        - value: converting
        - value: in_queue
    ProjectExtendedResponseModelAccessLevel:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    ProjectExtendedResponseModelFiction:
      type: string
      enum:
        - value: fiction
        - value: non-fiction
    ProjectCreationMetaResponseModelStatus:
      type: string
      enum:
        - value: pending
        - value: creating
        - value: finished
        - value: failed
    ProjectCreationMetaResponseModelType:
      type: string
      enum:
        - value: blank
        - value: generate_podcast
        - value: auto_assign_voices
    ProjectCreationMetaResponseModel:
      type: object
      properties:
        creation_progress:
          type: number
          format: double
          description: The progress of the project creation.
        status:
          $ref: '#/components/schemas/ProjectCreationMetaResponseModelStatus'
          description: The status of the project creation action.
        type:
          $ref: '#/components/schemas/ProjectCreationMetaResponseModelType'
          description: The type of the project creation action.
      required:
        - creation_progress
        - status
        - type
    ProjectExtendedResponseModelSourceType:
      type: string
      enum:
        - value: blank
        - value: book
        - value: article
        - value: genfm
        - value: video
        - value: screenplay
    CaptionStyleTemplateModel:
      type: object
      properties:
        key:
          type: string
        label:
          type: string
        requires_high_fps:
          type: boolean
          default: false
      required:
        - key
        - label
    CaptionStyleModelTextAlign:
      type: string
      enum:
        - value: start
        - value: center
        - value: end
    CaptionStyleModelTextStyle:
      type: string
      enum:
        - value: normal
        - value: italic
    CaptionStyleModelTextWeight:
      type: string
      enum:
        - value: normal
        - value: bold
    CaptionStyleSectionAnimationModelEnterType:
      type: string
      enum:
        - value: none
        - value: fade
        - value: scale
    CaptionStyleSectionAnimationModelExitType:
      type: string
      enum:
        - value: none
        - value: fade
        - value: scale
    CaptionStyleSectionAnimationModel:
      type: object
      properties:
        enter_type:
          $ref: '#/components/schemas/CaptionStyleSectionAnimationModelEnterType'
        exit_type:
          $ref: '#/components/schemas/CaptionStyleSectionAnimationModelExitType'
      required:
        - enter_type
        - exit_type
    CaptionStyleWordAnimationModelEnterType:
      type: string
      enum:
        - value: none
        - value: fade
        - value: scale
    CaptionStyleWordAnimationModelExitType:
      type: string
      enum:
        - value: none
        - value: fade
        - value: scale
    CaptionStyleWordAnimationModel:
      type: object
      properties:
        enter_type:
          $ref: '#/components/schemas/CaptionStyleWordAnimationModelEnterType'
        exit_type:
          $ref: '#/components/schemas/CaptionStyleWordAnimationModelExitType'
      required:
        - enter_type
        - exit_type
    CaptionStyleCharacterAnimationModelEnterType:
      type: string
      enum:
        - value: none
        - value: fade
    CaptionStyleCharacterAnimationModelExitType:
      type: string
      enum:
        - value: none
        - value: fade
    CaptionStyleCharacterAnimationModel:
      type: object
      properties:
        enter_type:
          $ref: '#/components/schemas/CaptionStyleCharacterAnimationModelEnterType'
        exit_type:
          $ref: '#/components/schemas/CaptionStyleCharacterAnimationModelExitType'
      required:
        - enter_type
        - exit_type
    CaptionStyleHorizontalPlacementModelAlign:
      type: string
      enum:
        - value: left
        - value: center
        - value: right
    CaptionStyleHorizontalPlacementModel:
      type: object
      properties:
        align:
          $ref: '#/components/schemas/CaptionStyleHorizontalPlacementModelAlign'
        translate_pct:
          type: number
          format: double
      required:
        - align
        - translate_pct
    CaptionStyleVerticalPlacementModelAlign:
      type: string
      enum:
        - value: top
        - value: center
        - value: bottom
    CaptionStyleVerticalPlacementModel:
      type: object
      properties:
        align:
          $ref: '#/components/schemas/CaptionStyleVerticalPlacementModelAlign'
        translate_pct:
          type: number
          format: double
      required:
        - align
        - translate_pct
    CaptionStyleModel:
      type: object
      properties:
        template:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleTemplateModel'
            - type: 'null'
        text_font:
          type:
            - string
            - 'null'
        text_scale:
          type:
            - number
            - 'null'
          format: double
        text_color:
          type:
            - string
            - 'null'
        text_align:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleModelTextAlign'
            - type: 'null'
        text_style:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleModelTextStyle'
            - type: 'null'
        text_weight:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleModelTextWeight'
            - type: 'null'
        background_enabled:
          type:
            - boolean
            - 'null'
        background_color:
          type:
            - string
            - 'null'
        background_opacity:
          type:
            - number
            - 'null'
          format: double
        word_highlights_enabled:
          type:
            - boolean
            - 'null'
        word_highlights_color:
          type:
            - string
            - 'null'
        word_highlights_background_color:
          type:
            - string
            - 'null'
        word_highlights_opacity:
          type:
            - number
            - 'null'
          format: double
        section_animation:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleSectionAnimationModel'
            - type: 'null'
        word_animation:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleWordAnimationModel'
            - type: 'null'
        character_animation:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleCharacterAnimationModel'
            - type: 'null'
        width_pct:
          type:
            - number
            - 'null'
          format: double
        horizontal_placement:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleHorizontalPlacementModel'
            - type: 'null'
        vertical_placement:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleVerticalPlacementModel'
            - type: 'null'
        auto_break_enabled:
          type:
            - boolean
            - 'null'
        max_lines_per_section:
          type:
            - integer
            - 'null'
        max_words_per_line:
          type:
            - integer
            - 'null'
    ProjectExtendedResponseModelAspectRatio:
      type: string
      enum:
        - value: '16:9'
        - value: '9:16'
        - value: '4:5'
        - value: '1:1'
    ProjectExtendedResponseModelQualityPreset:
      type: string
      enum:
        - value: standard
        - value: high
        - value: highest
        - value: ultra
        - value: ultra_lossless
    ChapterState:
      type: string
      enum:
        - value: default
        - value: converting
    ChapterStatisticsResponseModel:
      type: object
      properties:
        characters_unconverted:
          type: integer
          description: The number of unconverted characters.
        characters_converted:
          type: integer
          description: The number of converted characters.
        paragraphs_converted:
          type: integer
          description: The number of converted paragraphs.
        paragraphs_unconverted:
          type: integer
          description: The number of unconverted paragraphs.
      required:
        - characters_unconverted
        - characters_converted
        - paragraphs_converted
        - paragraphs_unconverted
    ChapterResponseModel:
      type: object
      properties:
        chapter_id:
          type: string
          description: The ID of the chapter.
        name:
          type: string
          description: The name of the chapter.
        last_conversion_date_unix:
          type:
            - integer
            - 'null'
          description: The last conversion date of the chapter.
        conversion_progress:
          type:
            - number
            - 'null'
          format: double
          description: The conversion progress of the chapter.
        can_be_downloaded:
          type: boolean
          description: Whether the chapter can be downloaded.
        state:
          $ref: '#/components/schemas/ChapterState'
          description: The state of the chapter.
        has_video:
          type:
            - boolean
            - 'null'
          description: Whether the chapter has a video.
        voice_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of voice ids used by the chapter
        statistics:
          oneOf:
            - $ref: '#/components/schemas/ChapterStatisticsResponseModel'
            - type: 'null'
          description: The statistics of the chapter.
        last_conversion_error:
          type:
            - string
            - 'null'
          description: The last conversion error of the chapter.
      required:
        - chapter_id
        - name
        - can_be_downloaded
        - state
    PronunciationDictionaryVersionResponseModelPermissionOnResource:
      type: string
      enum:
        - value: admin
        - value: editor
        - value: commenter
        - value: viewer
    PronunciationDictionaryVersionResponseModel:
      type: object
      properties:
        version_id:
          type: string
        version_rules_num:
          type: integer
        pronunciation_dictionary_id:
          type: string
        dictionary_name:
          type: string
        version_name:
          type: string
        permission_on_resource:
          oneOf:
            - $ref: >-
                #/components/schemas/PronunciationDictionaryVersionResponseModelPermissionOnResource
            - type: 'null'
        created_by:
          type: string
        creation_time_unix:
          type: integer
        archived_time_unix:
          type:
            - integer
            - 'null'
      required:
        - version_id
        - version_rules_num
        - pronunciation_dictionary_id
        - dictionary_name
        - version_name
        - permission_on_resource
        - created_by
        - creation_time_unix
    PronunciationDictionaryLocatorResponseModel:
      type: object
      properties:
        pronunciation_dictionary_id:
          type: string
        version_id:
          type:
            - string
            - 'null'
      required:
        - pronunciation_dictionary_id
        - version_id
    ProjectExtendedResponseModelApplyTextNormalization:
      type: string
      enum:
        - value: auto
        - value: 'on'
        - value: 'off'
        - value: apply_english
    ProjectExtendedResponseModelExperimental:
      type: object
      properties: {}
    ProjectVideoThumbnailSheetResponseModel:
      type: object
      properties:
        start_thumbnail_index:
          type: integer
        thumbnail_count:
          type: integer
        signed_cloud_url:
          type: string
      required:
        - start_thumbnail_index
        - thumbnail_count
        - signed_cloud_url
    CanvasPlacement:
      type: object
      properties:
        x:
          type: number
          format: double
          default: 0
        'y':
          type: number
          format: double
          default: 0
        scale_x:
          type: number
          format: double
          default: 1
        scale_y:
          type: number
          format: double
          default: 1
        pivot_x:
          type: number
          format: double
          default: 0
        pivot_y:
          type: number
          format: double
          default: 0
        skew_x:
          type: number
          format: double
          default: 0
        skew_y:
          type: number
          format: double
          default: 0
    ProjectVideoResponseModel:
      type: object
      properties:
        video_id:
          type: string
        filename:
          type: string
        signed_url:
          type: string
        signed_preview_url:
          type:
            - string
            - 'null'
        offset_ms:
          type: integer
        duration_ms:
          type: integer
        volume_gain_db:
          type: number
          format: double
        muted:
          type: boolean
        width:
          type: integer
        height:
          type: integer
        codec:
          type: string
        order:
          type: string
        preview_job_progress:
          type: number
          format: double
        created_at_ms:
          type: integer
        updated_at_ms:
          type: integer
        error:
          type:
            - string
            - 'null'
        thumbnail_interval_seconds:
          type: number
          format: double
        thumbnail_size:
          type: array
          items:
            type: integer
        thumbnail_sheets:
          type: array
          items:
            $ref: '#/components/schemas/ProjectVideoThumbnailSheetResponseModel'
        start_time_ms:
          type: integer
        end_time_ms:
          type: integer
        asset_preview_signed_url:
          type:
            - string
            - 'null'
        source_video_id:
          type:
            - string
            - 'null'
        source_asset_id:
          type:
            - string
            - 'null'
        pending_block_ids:
          type: array
          items:
            type: string
        import_speech_progress:
          type:
            - number
            - 'null'
          format: double
        speech_imported:
          type: boolean
          default: false
        current_snapshot_id:
          type:
            - string
            - 'null'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: video
        canvas_placement:
          $ref: '#/components/schemas/CanvasPlacement'
      required:
        - video_id
        - filename
        - signed_url
        - signed_preview_url
        - offset_ms
        - duration_ms
        - volume_gain_db
        - muted
        - width
        - height
        - codec
        - order
        - preview_job_progress
        - created_at_ms
        - updated_at_ms
        - thumbnail_interval_seconds
        - thumbnail_size
        - thumbnail_sheets
        - start_time_ms
        - end_time_ms
        - pending_block_ids
    ProjectExternalAudioResponseModel:
      type: object
      properties:
        external_audio_id:
          type: string
        filename:
          type: string
        signed_url:
          type: string
        offset_ms:
          type: integer
        duration_ms:
          type: integer
        start_time_ms:
          type: integer
        end_time_ms:
          type: integer
        order:
          type: string
        track_id:
          type: string
        created_at_ms:
          type: integer
        updated_at_ms:
          type: integer
        volume_gain_db:
          type: number
          format: double
          default: 0
        muted:
          type: boolean
          default: false
        fade_in_ms:
          type: integer
          default: 0
        fade_out_ms:
          type: integer
          default: 0
        source_external_audio_id:
          type:
            - string
            - 'null'
        source_asset_id:
          type:
            - string
            - 'null'
        pending_block_ids:
          type: array
          items:
            type: string
        import_speech_progress:
          type:
            - number
            - 'null'
          format: double
        speech_imported:
          type: boolean
          default: false
        current_snapshot_id:
          type:
            - string
            - 'null'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: audio
      required:
        - external_audio_id
        - filename
        - signed_url
        - offset_ms
        - duration_ms
        - start_time_ms
        - end_time_ms
        - order
        - track_id
        - created_at_ms
        - updated_at_ms
        - pending_block_ids
    ProjectImageResponseModel:
      type: object
      properties:
        image_id:
          type: string
        filename:
          type: string
        signed_url:
          type: string
        thumbnail_signed_url:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: image
        source:
          type: string
          enum:
            - type: stringLiteral
              value: upload
        file_size_bytes:
          type: integer
        width:
          type: integer
        height:
          type: integer
        offset_ms:
          type: integer
        duration_ms:
          type: integer
        order:
          type: string
        canvas_placement:
          $ref: '#/components/schemas/CanvasPlacement'
        created_at_ms:
          type: integer
        updated_at_ms:
          type: integer
        current_snapshot_id:
          type:
            - string
            - 'null'
        source_asset_id:
          type:
            - string
            - 'null'
      required:
        - image_id
        - filename
        - signed_url
        - thumbnail_signed_url
        - file_size_bytes
        - width
        - height
        - offset_ms
        - duration_ms
        - order
        - canvas_placement
        - created_at_ms
        - updated_at_ms
    ProjectExtendedResponseModelAssetsItems:
      oneOf:
        - $ref: '#/components/schemas/ProjectVideoResponseModel'
        - $ref: '#/components/schemas/ProjectExternalAudioResponseModel'
        - $ref: '#/components/schemas/ProjectImageResponseModel'
    ProjectVoiceResponseModel:
      type: object
      properties:
        voice_id:
          type: string
        alias:
          type: string
        stability:
          type: number
          format: double
        similarity_boost:
          type: number
          format: double
        style:
          type: number
          format: double
        is_pinned:
          type: boolean
        use_speaker_boost:
          type: boolean
        volume_gain:
          type: number
          format: double
        speed:
          type: number
          format: double
      required:
        - voice_id
        - alias
        - stability
        - similarity_boost
        - style
        - is_pinned
        - use_speaker_boost
        - volume_gain
        - speed
    SpeakerSeparationResponseModelStatus:
      type: string
      enum:
        - value: not_started
        - value: pending
        - value: completed
        - value: failed
    UtteranceResponseModel:
      type: object
      properties:
        start:
          type: number
          format: double
          description: The start time of the utterance in seconds.
        end:
          type: number
          format: double
          description: The end time of the utterance in seconds.
      required:
        - start
        - end
    SpeakerResponseModel:
      type: object
      properties:
        speaker_id:
          type: string
          description: The ID of the speaker.
        duration_secs:
          type: number
          format: double
          description: The duration of the speaker segment in seconds.
        utterances:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/UtteranceResponseModel'
          description: The utterances of the speaker.
      required:
        - speaker_id
        - duration_secs
    SpeakerSeparationResponseModel:
      type: object
      properties:
        voice_id:
          type: string
          description: The ID of the voice.
        sample_id:
          type: string
          description: The ID of the sample.
        status:
          $ref: '#/components/schemas/SpeakerSeparationResponseModelStatus'
          description: The status of the speaker separation.
        speakers:
          type:
            - object
            - 'null'
          additionalProperties:
            $ref: '#/components/schemas/SpeakerResponseModel'
          description: The speakers of the sample.
        selected_speaker_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: The IDs of the selected speakers.
      required:
        - voice_id
        - sample_id
        - status
    SampleResponseModel:
      type: object
      properties:
        sample_id:
          type: string
          description: The ID of the sample.
        file_name:
          type: string
          description: The name of the sample file.
        mime_type:
          type: string
          description: The MIME type of the sample file.
        size_bytes:
          type: integer
          description: The size of the sample file in bytes.
        hash:
          type: string
          description: The hash of the sample file.
        duration_secs:
          type:
            - number
            - 'null'
          format: double
        remove_background_noise:
          type:
            - boolean
            - 'null'
        has_isolated_audio:
          type:
            - boolean
            - 'null'
        has_isolated_audio_preview:
          type:
            - boolean
            - 'null'
        speaker_separation:
          oneOf:
            - $ref: '#/components/schemas/SpeakerSeparationResponseModel'
            - type: 'null'
        trim_start:
          type:
            - integer
            - 'null'
        trim_end:
          type:
            - integer
            - 'null'
    VoiceResponseModelCategory:
      type: string
      enum:
        - value: generated
        - value: cloned
        - value: premade
        - value: professional
        - value: famous
        - value: high_quality
    FineTuningResponseModelState:
      type: string
      enum:
        - value: not_started
        - value: queued
        - value: fine_tuning
        - value: fine_tuned
        - value: failed
        - value: delayed
    RecordingResponseModel:
      type: object
      properties:
        recording_id:
          type: string
          description: The ID of the recording.
        mime_type:
          type: string
          description: The MIME type of the recording.
        size_bytes:
          type: integer
          description: The size of the recording in bytes.
        upload_date_unix:
          type: integer
          description: The date of the recording in Unix time.
        transcription:
          type: string
          description: The transcription of the recording.
      required:
        - recording_id
        - mime_type
        - size_bytes
        - upload_date_unix
        - transcription
    VerificationAttemptResponseModel:
      type: object
      properties:
        text:
          type: string
          description: The text of the verification attempt.
        date_unix:
          type: integer
          description: The date of the verification attempt in Unix time.
        accepted:
          type: boolean
          description: Whether the verification attempt was accepted.
        similarity:
          type: number
          format: double
          description: The similarity of the verification attempt.
        levenshtein_distance:
          type: number
          format: double
          description: The Levenshtein distance of the verification attempt.
        recording:
          oneOf:
            - $ref: '#/components/schemas/RecordingResponseModel'
            - type: 'null'
          description: The recording of the verification attempt.
      required:
        - text
        - date_unix
        - accepted
        - similarity
        - levenshtein_distance
    ManualVerificationFileResponseModel:
      type: object
      properties:
        file_id:
          type: string
          description: The ID of the file.
        file_name:
          type: string
          description: The name of the file.
        mime_type:
          type: string
          description: The MIME type of the file.
        size_bytes:
          type: integer
          description: The size of the file in bytes.
        upload_date_unix:
          type: integer
          description: The date of the file in Unix time.
      required:
        - file_id
        - file_name
        - mime_type
        - size_bytes
        - upload_date_unix
    ManualVerificationResponseModel:
      type: object
      properties:
        extra_text:
          type: string
          description: The extra text of the manual verification.
        request_time_unix:
          type: integer
          description: The date of the manual verification in Unix time.
        files:
          type: array
          items:
            $ref: '#/components/schemas/ManualVerificationFileResponseModel'
          description: The files of the manual verification.
      required:
        - extra_text
        - request_time_unix
        - files
    FineTuningResponseModel:
      type: object
      properties:
        is_allowed_to_fine_tune:
          type: boolean
          description: Whether the user is allowed to fine-tune the voice.
        state:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/FineTuningResponseModelState'
          description: The state of the fine-tuning process for each model.
        verification_failures:
          type: array
          items:
            type: string
          description: List of verification failures in the fine-tuning process.
        verification_attempts_count:
          type: integer
          description: The number of verification attempts in the fine-tuning process.
        manual_verification_requested:
          type: boolean
          description: >-
            Whether a manual verification was requested for the fine-tuning
            process.
        language:
          type:
            - string
            - 'null'
          description: The language of the fine-tuning process.
        progress:
          type:
            - object
            - 'null'
          additionalProperties:
            type: number
            format: double
          description: The progress of the fine-tuning process.
        message:
          type:
            - object
            - 'null'
          additionalProperties:
            type: string
          description: The message of the fine-tuning process.
        dataset_duration_seconds:
          type:
            - number
            - 'null'
          format: double
          description: The duration of the dataset in seconds.
        verification_attempts:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/VerificationAttemptResponseModel'
          description: The number of verification attempts.
        slice_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of slice IDs.
        manual_verification:
          oneOf:
            - $ref: '#/components/schemas/ManualVerificationResponseModel'
            - type: 'null'
          description: The manual verification of the fine-tuning process.
        max_verification_attempts:
          type:
            - integer
            - 'null'
          description: The maximum number of verification attempts.
        next_max_verification_attempts_reset_unix_ms:
          type:
            - integer
            - 'null'
          description: >-
            The next maximum verification attempts reset time in Unix
            milliseconds.
        finetuning_state:
          description: Any type
    VoiceSettingsResponseModel:
      type: object
      properties:
        stability:
          type:
            - number
            - 'null'
          format: double
          default: 0.5
          description: >-
            Determines how stable the voice is and the randomness between each
            generation. Lower values introduce broader emotional range for the
            voice. Higher values can result in a monotonous voice with limited
            emotion.
        use_speaker_boost:
          type:
            - boolean
            - 'null'
          default: true
          description: >-
            This setting boosts the similarity to the original speaker. Using
            this setting requires a slightly higher computational load, which in
            turn increases latency.
        similarity_boost:
          type:
            - number
            - 'null'
          format: double
          default: 0.75
          description: >-
            Determines how closely the AI should adhere to the original voice
            when attempting to replicate it.
        style:
          type:
            - number
            - 'null'
          format: double
          default: 0
          description: >-
            Determines the style exaggeration of the voice. This setting
            attempts to amplify the style of the original speaker. It does
            consume additional computational resources and might increase
            latency if set to anything other than 0.
        speed:
          type:
            - number
            - 'null'
          format: double
          default: 1
          description: >-
            Adjusts the speed of the voice. A value of 1.0 is the default speed,
            while values less than 1.0 slow down the speech, and values greater
            than 1.0 speed it up.
    voice_sharing_state:
      type: string
      enum:
        - value: enabled
        - value: disabled
        - value: copied
        - value: copied_disabled
    VoiceSharingResponseModelCategory:
      type: string
      enum:
        - value: generated
        - value: cloned
        - value: premade
        - value: professional
        - value: famous
        - value: high_quality
    review_status:
      type: string
      enum:
        - value: not_requested
        - value: pending
        - value: declined
        - value: allowed
        - value: allowed_with_changes
    VoiceSharingModerationCheckResponseModel:
      type: object
      properties:
        date_checked_unix:
          type:
            - integer
            - 'null'
          description: The date the moderation check was made in Unix time.
        name_value:
          type:
            - string
            - 'null'
          description: The name value of the voice.
        name_check:
          type:
            - boolean
            - 'null'
          description: Whether the name check was successful.
        description_value:
          type:
            - string
            - 'null'
          description: The description value of the voice.
        description_check:
          type:
            - boolean
            - 'null'
          description: Whether the description check was successful.
        sample_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of sample IDs.
        sample_checks:
          type:
            - array
            - 'null'
          items:
            type: number
            format: double
          description: A list of sample checks.
        captcha_ids:
          type:
            - array
            - 'null'
          items:
            type: string
          description: A list of captcha IDs.
        captcha_checks:
          type:
            - array
            - 'null'
          items:
            type: number
            format: double
          description: A list of CAPTCHA check values.
    ReaderResourceResponseModelResourceType:
      type: string
      enum:
        - value: read
        - value: collection
    ReaderResourceResponseModel:
      type: object
      properties:
        resource_type:
          $ref: '#/components/schemas/ReaderResourceResponseModelResourceType'
          description: The type of resource.
        resource_id:
          type: string
          description: The ID of the resource.
      required:
        - resource_type
        - resource_id
    VoiceSharingResponseModel:
      type: object
      properties:
        status:
          $ref: '#/components/schemas/voice_sharing_state'
          description: The status of the voice sharing.
        history_item_sample_id:
          type:
            - string
            - 'null'
          description: The sample ID of the history item.
        date_unix:
          type: integer
          description: The date of the voice sharing in Unix time.
        whitelisted_emails:
          type: array
          items:
            type: string
          description: A list of whitelisted emails.
        public_owner_id:
          type: string
          description: The ID of the public owner.
        original_voice_id:
          type: string
          description: The ID of the original voice.
        financial_rewards_enabled:
          type: boolean
          description: Whether financial rewards are enabled.
        free_users_allowed:
          type: boolean
          description: Whether free users are allowed.
        live_moderation_enabled:
          type: boolean
          description: Whether live moderation is enabled.
        rate:
          type:
            - number
            - 'null'
          format: double
          description: The rate of the voice sharing.
        fiat_rate:
          type:
            - number
            - 'null'
          format: double
          description: The rate of the voice sharing in USD per 1000 credits.
        notice_period:
          type: integer
          description: The notice period of the voice sharing.
        disable_at_unix:
          type:
            - integer
            - 'null'
          description: The date of the voice sharing in Unix time.
        voice_mixing_allowed:
          type: boolean
          description: Whether voice mixing is allowed.
        featured:
          type: boolean
          description: Whether the voice is featured.
        category:
          $ref: '#/components/schemas/VoiceSharingResponseModelCategory'
          description: The category of the voice.
        reader_app_enabled:
          type:
            - boolean
            - 'null'
          description: Whether the reader app is enabled.
        image_url:
          type:
            - string
            - 'null'
          description: The image URL of the voice.
        ban_reason:
          type:
            - string
            - 'null'
          description: The ban reason of the voice.
        liked_by_count:
          type: integer
          description: The number of likes on the voice.
        cloned_by_count:
          type: integer
          description: The number of clones on the voice.
        name:
          type: string
          description: The name of the voice.
        description:
          type:
            - string
            - 'null'
          description: The description of the voice.
        labels:
          type: object
          additionalProperties:
            type: string
          description: The labels of the voice.
        review_status:
          $ref: '#/components/schemas/review_status'
          description: The review status of the voice.
        review_message:
          type:
            - string
            - 'null'
          description: The review message of the voice.
        enabled_in_library:
          type: boolean
          description: Whether the voice is enabled in the library.
        instagram_username:
          type:
            - string
            - 'null'
          description: The Instagram username of the voice.
        twitter_username:
          type:
            - string
            - 'null'
          description: The Twitter/X username of the voice.
        youtube_username:
          type:
            - string
            - 'null'
          description: The YouTube username of the voice.
        tiktok_username:
          type:
            - string
            - 'null'
          description: The TikTok username of the voice.
        moderation_check:
          oneOf:
            - $ref: '#/components/schemas/VoiceSharingModerationCheckResponseModel'
            - type: 'null'
          description: The moderation check of the voice.
        reader_restricted_on:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/ReaderResourceResponseModel'
          description: The reader restricted on of the voice.
    VerifiedVoiceLanguageResponseModel:
      type: object
      properties:
        language:
          type: string
          description: The language of the voice.
        model_id:
          type: string
          description: The voice's model ID.
        accent:
          type:
            - string
            - 'null'
          description: The voice's accent, if applicable.
        locale:
          type:
            - string
            - 'null'
          description: The voice's locale, if applicable.
        preview_url:
          type:
            - string
            - 'null'
          description: The voice's preview URL, if applicable.
      required:
        - language
        - model_id
    VoiceResponseModelSafetyControl:
      type: string
      enum:
        - value: NONE
        - value: BAN
        - value: CAPTCHA
        - value: ENTERPRISE_BAN
        - value: ENTERPRISE_CAPTCHA
    VoiceVerificationResponseModel:
      type: object
      properties:
        requires_verification:
          type: boolean
          description: Whether the voice requires verification.
        is_verified:
          type: boolean
          description: Whether the voice has been verified.
        verification_failures:
          type: array
          items:
            type: string
          description: List of verification failures.
        verification_attempts_count:
          type: integer
          description: The number of verification attempts.
        language:
          type:
            - string
            - 'null'
          description: The language of the voice.
        verification_attempts:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/VerificationAttemptResponseModel'
          description: Number of times a verification was attempted.
      required:
        - requires_verification
        - is_verified
        - verification_failures
        - verification_attempts_count
    VoiceResponseModel:
      type: object
      properties:
        voice_id:
          type: string
          description: The ID of the voice.
        name:
          type: string
          description: The name of the voice.
        samples:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/SampleResponseModel'
          description: List of samples associated with the voice.
        category:
          $ref: '#/components/schemas/VoiceResponseModelCategory'
          description: The category of the voice.
        fine_tuning:
          oneOf:
            - $ref: '#/components/schemas/FineTuningResponseModel'
            - type: 'null'
          description: Fine-tuning information for the voice.
        labels:
          type: object
          additionalProperties:
            type: string
          description: Labels associated with the voice.
        description:
          type:
            - string
            - 'null'
          description: The description of the voice.
        preview_url:
          type:
            - string
            - 'null'
          description: The preview URL of the voice.
        available_for_tiers:
          type: array
          items:
            type: string
          description: The tiers the voice is available for.
        settings:
          oneOf:
            - $ref: '#/components/schemas/VoiceSettingsResponseModel'
            - type: 'null'
          description: The settings of the voice.
        sharing:
          oneOf:
            - $ref: '#/components/schemas/VoiceSharingResponseModel'
            - type: 'null'
          description: The sharing information of the voice.
        high_quality_base_model_ids:
          type: array
          items:
            type: string
          description: The base model IDs for high-quality voices.
        verified_languages:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/VerifiedVoiceLanguageResponseModel'
          description: The verified languages of the voice.
        safety_control:
          oneOf:
            - $ref: '#/components/schemas/VoiceResponseModelSafetyControl'
            - type: 'null'
          description: The safety controls of the voice.
        voice_verification:
          oneOf:
            - $ref: '#/components/schemas/VoiceVerificationResponseModel'
            - type: 'null'
          description: The voice verification of the voice.
        permission_on_resource:
          type:
            - string
            - 'null'
          description: The permission on the resource of the voice.
        is_owner:
          type:
            - boolean
            - 'null'
          description: Whether the voice is owned by the user.
        is_legacy:
          type: boolean
          default: false
          description: Whether the voice is legacy.
        is_mixed:
          type: boolean
          default: false
          description: Whether the voice is mixed.
        favorited_at_unix:
          type:
            - integer
            - 'null'
          description: Timestamp when the voice was marked as favorite in Unix time.
        created_at_unix:
          type:
            - integer
            - 'null'
          description: The creation time of the voice in Unix time.
      required:
        - voice_id
    ProjectExtendedResponseModel:
      type: object
      properties:
        project_id:
          type: string
          description: The ID of the project.
        name:
          type: string
          description: The name of the project.
        create_date_unix:
          type: integer
          description: The creation date of the project.
        created_by_user_id:
          type:
            - string
            - 'null'
          description: The user ID who created the project.
        default_title_voice_id:
          type: string
          description: The default title voice ID.
        default_paragraph_voice_id:
          type: string
          description: The default paragraph voice ID.
        default_model_id:
          type: string
          description: The default model ID.
        last_conversion_date_unix:
          type:
            - integer
            - 'null'
          description: The last conversion date of the project.
        can_be_downloaded:
          type: boolean
          description: Whether the project can be downloaded.
        title:
          type:
            - string
            - 'null'
          description: The title of the project.
        author:
          type:
            - string
            - 'null'
          description: The author of the project.
        description:
          type:
            - string
            - 'null'
          description: The description of the project.
        genres:
          type:
            - array
            - 'null'
          items:
            type: string
          description: List of genres of the project.
        cover_image_url:
          type:
            - string
            - 'null'
          description: The cover image URL of the project.
        target_audience:
          oneOf:
            - $ref: '#/components/schemas/ProjectExtendedResponseModelTargetAudience'
            - type: 'null'
          description: The target audience of the project.
        language:
          type:
            - string
            - 'null'
          description: Two-letter language code (ISO 639-1) of the language of the project.
        content_type:
          type:
            - string
            - 'null'
          description: The content type of the project, e.g. 'Novel' or 'Short Story'
        original_publication_date:
          type:
            - string
            - 'null'
          description: The original publication date of the project.
        mature_content:
          type:
            - boolean
            - 'null'
          description: Whether the project contains mature content.
        isbn_number:
          type:
            - string
            - 'null'
          description: The ISBN number of the project.
        volume_normalization:
          type: boolean
          description: Whether the project uses volume normalization.
        state:
          $ref: '#/components/schemas/ProjectState'
          description: The state of the project.
        access_level:
          $ref: '#/components/schemas/ProjectExtendedResponseModelAccessLevel'
          description: The access level of the project.
        fiction:
          oneOf:
            - $ref: '#/components/schemas/ProjectExtendedResponseModelFiction'
            - type: 'null'
          description: Whether the project is fiction.
        quality_check_on:
          type: boolean
          description: Whether quality check is enabled for this project.
        quality_check_on_when_bulk_convert:
          type: boolean
          description: >-
            Whether quality check is enabled on the project when bulk
            converting.
        creation_meta:
          oneOf:
            - $ref: '#/components/schemas/ProjectCreationMetaResponseModel'
            - type: 'null'
          description: The creation meta of the project.
        source_type:
          oneOf:
            - $ref: '#/components/schemas/ProjectExtendedResponseModelSourceType'
            - type: 'null'
          description: The source type of the project.
        chapters_enabled:
          type:
            - boolean
            - 'null'
          default: true
          description: Whether chapters are enabled for the project.
        captions_enabled:
          type:
            - boolean
            - 'null'
          default: true
          description: Whether captions are enabled for the project.
        caption_style:
          oneOf:
            - $ref: '#/components/schemas/CaptionStyleModel'
            - type: 'null'
          description: Global styling to be applied to all captions
        public_share_id:
          type:
            - string
            - 'null'
          description: The public share ID of the project.
        aspect_ratio:
          oneOf:
            - $ref: '#/components/schemas/ProjectExtendedResponseModelAspectRatio'
            - type: 'null'
          description: The aspect ratio of the project.
        quality_preset:
          $ref: '#/components/schemas/ProjectExtendedResponseModelQualityPreset'
          description: The quality preset level of the project.
        chapters:
          type: array
          items:
            $ref: '#/components/schemas/ChapterResponseModel'
          description: List of chapters of the project and their metadata.
        pronunciation_dictionary_versions:
          type: array
          items:
            $ref: '#/components/schemas/PronunciationDictionaryVersionResponseModel'
          description: >-
            List of pronunciation dictionary versions of the project and their
            metadata.
        pronunciation_dictionary_locators:
          type: array
          items:
            $ref: '#/components/schemas/PronunciationDictionaryLocatorResponseModel'
          description: List of pronunciation dictionary locators.
        apply_text_normalization:
          $ref: >-
            #/components/schemas/ProjectExtendedResponseModelApplyTextNormalization
          description: Whether text normalization is applied to the project.
        experimental:
          $ref: '#/components/schemas/ProjectExtendedResponseModelExperimental'
          description: Experimental features for the project.
        assets:
          type: array
          items:
            $ref: '#/components/schemas/ProjectExtendedResponseModelAssetsItems'
          description: List of uploaded assets e.g. videos, audios.
        voices:
          type: array
          items:
            $ref: '#/components/schemas/ProjectVoiceResponseModel'
          description: List of configured project voices.
        base_voices:
          type:
            - array
            - 'null'
          items:
            $ref: '#/components/schemas/VoiceResponseModel'
          description: List of voices used by the project.
      required:
        - project_id
        - name
        - create_date_unix
        - created_by_user_id
        - default_title_voice_id
        - default_paragraph_voice_id
        - default_model_id
        - can_be_downloaded
        - volume_normalization
        - state
        - access_level
        - quality_check_on
        - quality_check_on_when_bulk_convert
        - quality_preset
        - chapters
        - pronunciation_dictionary_versions
        - pronunciation_dictionary_locators
        - apply_text_normalization
        - assets
        - voices

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.studio.projects.get("project_id", {});
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.studio.projects.get(
    project_id="project_id"
)

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/studio/projects/project_id"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("xi-api-key", "xi-api-key")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.elevenlabs.io/v1/studio/projects/project_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/studio/projects/project_id")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/studio/projects/project_id', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/studio/projects/project_id");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/studio/projects/project_id")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```