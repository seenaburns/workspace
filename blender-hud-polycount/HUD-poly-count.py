bl_info = {
    "name": "HUD Poly Count",
    "author": "",
    "version": (0, 1),
    "blender": (2, 75, 0),
    "location": "",
    "warning": "",
    "description": "Shows verts/edges/tris/faces/ngon count and selected",
    "wiki_url": "",
    "tracker_url": "",
    "category": "3D View"
}

import bgl, blf, bpy

FONT_SIZE = 10
OFFSET_X = 20
OFFSET_Y = -50
LINE_SPACING = 5
COLUMN_WIDTH = 50

def getMeshData(bmesh):
    data = {
        'name': bmesh.name,
        'vert_count': (len(bmesh.vertices), len([x for x in bmesh.vertices if x.select])),
        'edge_count': (len(bmesh.edges), len([x for x in bmesh.edges if x.select])),
        'poly_count': None
    }

    tris = [x for x in bmesh.polygons if len(x.vertices) == 3]
    faces = bmesh.polygons
    ngons = [x for x in bmesh.polygons if len(x.vertices) > 4]

    data['poly_count'] = [
        (len(tris), len([x for x in tris if x.select])),
        (len(faces), len([x for x in faces if x.select])),
        (len(ngons), len([x for x in ngons if x.select])),
    ]

    return data

def getDisplayLocation(context):
    pos_x = OFFSET_X # int(context.region.width)
    pos_y = int(context.region.height) + OFFSET_Y
    return (pos_x, pos_y)

def getBoundingBox(text):
    w,h = blf.dimensions(0,text)
    # round to stop popping
    h = int(h/3.0)*3.0
    return (w, h)

def draw_text(self, context, pos_x, pos_y, text):
    font_id = 0;
    blf.size(font_id, FONT_SIZE, 72)
    blf.position(font_id,pos_x,pos_y,0)
    blf.draw(font_id, text)

# textMatrix is 2d array of columns/rows of text
def draw_text_matrix(self, context, textMatrix):
    pos_x, pos_y = getDisplayLocation(context)

    off_y = 0
    for r in textMatrix:
        off_x = 0
        for c in r:
            text = str(c)
            draw_text(self,context,pos_x+off_x,pos_y+off_y,text)

            text_width, text_height = getBoundingBox(text)
            off_x += COLUMN_WIDTH
        off_y -= (text_height + LINE_SPACING)

def draw_callback_px_text(self, context):
    pos_x, pos_y = getDisplayLocation(context)

    text = []
    if  bpy.context.active_object.mode == 'EDIT':
        bpy.context.object.update_from_editmode()
        bmesh = bpy.context.object.data
        meshData = getMeshData(bmesh)
        text = [
            [meshData['name']],
            ['Verts', meshData['vert_count'][0], meshData['vert_count'][1]],
            ['Edges', meshData['edge_count'][0], meshData['edge_count'][1]],
            ['Faces', meshData['poly_count'][1][0], meshData['poly_count'][1][1]],
            ['Tris', meshData['poly_count'][0][0], meshData['poly_count'][0][1]],
            ['N-Gons', meshData['poly_count'][2][0], meshData['poly_count'][2][1]],
        ]

        context.area.tag_redraw()

    draw_text_matrix(self, context, text)

def draw_callback_px(self, context):
    draw_callback_px_text(self, context)

class HUDPolyCount(bpy.types.Operator):
    bl_idname = "view3d.hud_poly_count"
    bl_label = "HUD Poly Count: Toggle"
    bl_description = "Display tri/vert/edge/poly count in viewport"
    last_activity = 'NONE'

    _handle = None

    @staticmethod
    def handle_add(self, context):
        if HUDPolyCount._handle is None:
            HUDPolyCount._handle = bpy.types.SpaceView3D.draw_handler_add(draw_callback_px, (self, context), 'WINDOW', 'POST_PIXEL')

    @staticmethod
    def handle_remove(context):
        if HUDPolyCount._handle is not None:
            bpy.types.SpaceView3D.draw_handler_remove(HUDPolyCount._handle, 'WINDOW')
        HUDPolyCount._handle = None

    def invoke(self, context, event):
        context.area.tag_redraw()
        if context.area.type == 'VIEW_3D':
            if context.window_manager.hudpolycount_active is False:
                # operator is called for the first time, start everything
                context.window_manager.hudpolycount_active = True
                HUDPolyCount.handle_add(self, context)
                return {'FINISHED'}
            else:
                # operator is called again, stop displaying
                context.window_manager.hudpolycount_active = False
                HUDPolyCount.handle_remove(context)
                return {'CANCELLED'}
        else:
            self.report({'WARNING'}, "3D View not found, can't run HUD Poly Count")
            return {'CANCELLED'}

classes = [HUDPolyCount]

def register():
    bpy.types.WindowManager.hudpolycount_active = bpy.props.BoolProperty(default=False)

    for c in classes:
        bpy.utils.register_class(c)

def unregister():
    # incase its enabled
    HUDPolyCount.handle_remove(bpy.context)

    for c in classes:
        bpy.utils.unregister_class(c)

    try:
        del bpy.context.window_manager['hudpolycount_active']
    except:
        pass

if __name__ == "__main__":
    register()
