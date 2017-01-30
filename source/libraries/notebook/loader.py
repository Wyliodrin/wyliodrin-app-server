import sys
import json
import os
import traceback
import types

import redis

wyliodrin_redis = redis.StrictRedis ()

#import matplotlib
#matplotlib.use ('Agg')

from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import PythonTracebackLexer



wyliodrin_formatter = HtmlFormatter (noclasses = True)


wyliodrin_types = []

def wyliodrin_print_result (strtype, strvalue):
	if not isinstance (strtype, str):
		strtype = repr (strtype)
	#os.write (3, '\n================================\n')
	# os.write (3, strtype+'\n')
	# try:
	# 	os.write (3, strvalue)
	# except UnicodeEncodeError:
	# 	bytes = strvalue.encode('UTF-8', 'backslashreplace')
	# 	os.write(3, bytes)
	# os.write (3, '\n'+sys.argv[1]+'\n')
	wyliodrin_redis.publish (sys.argv[1]+'response', strtype+'\n'+strvalue)

def wyliodrin_display (value):
	strtype = type (value)
	strvalue = None
	if value is None:
		return
	__builtins__._ = None
	#print isinstance (value, (types.TypeType, types.ClassType, types.ObjectType))
	if isinstance (value, (types.TypeType, types.ClassType, types.ObjectType)):
		#print 'object'
		# HTML
		if not strvalue:
			try:
				if callable (value._repr_html_):
					strvalue = value._repr_html_ ()
					strtype = '<format \'html\'>'
			except Exception, e:
				pass
		# SVG
		if not strvalue:
			try:
				if callable (value._repr_svg_):
					strvalue = value._repr_svg_ ()
					strtype = '<format \'html\'>'
			except Exception, e:
				pass
		# PNG
		if not strvalue:
			try:
				if callable (value._repr_png_):
					strvalue = value._repr_png_ ()
					strtype = '<format \'png\'>'
			except Exception, e:
				pass
		# JPG
		if not strvalue:
			try:
				if callable (value._repr_jpg_):
					strvalue = value._repr_jpg_ ()
					strtype = '<format \'jpg\'>'
			except Exception, e:
				pass
		# latex
		if not strvalue:
			try:
				if callable (value._repr_latex_):
					strvalue = value._repr_latex_ ()
					strtype = '<format \'latex\'>'
			except Exception, e:
				pass
		# types
		pos = 0;
		# print strvalue
		while strvalue == None and pos < len (wyliodrin_types):
			try:
				(t, s) = wyliodrin_types[pos](value)
				if t and s:
					strtype = t
					strvalue =s
				elif t:
					return
			except Exception, e:
				pass
			pos = pos + 1
		# other
		if not strvalue:
			strvalue = repr (value)
	else:
		strvalue = repr (value)
	if strvalue:
		wyliodrin_print_result (strtype, strvalue)


def wyliodrin_exception (type, value, tb):
	exception = ''.join (traceback.format_exception(type, value, tb))
	exception_html = highlight (exception, PythonTracebackLexer(), wyliodrin_formatter)
	#os.write (4, exception_html)
	#os.write (4, '\n'+sys.argv[1]+'\n')
	wyliodrin_redis.publish (sys.argv[1]+'exception', exception_html)

sys.displayhook = wyliodrin_display
sys.excepthook = wyliodrin_exception

sys.ps1 = '>>>\n';
sys.ps2 = '...\n';

os.chdir (os.getenv ('HOME')+'/notebook')
os.umask (002)

def wyliodrin_plot_type (value):
	try:
		import StringIO
		# print callable (value.get_figure)
		if hasattr (value, 'get_figure') and callable (value.get_figure):
			# print 'plot type'
			fig = value.get_figure ()
			imgdata = StringIO.StringIO ()
			fig.savefig (imgdata, format='svg')
			return ('<format \'svg\'>', imgdata.getvalue ())
	except Exception, e:
		print e
		pass
	return (None, None)

wyliodrin_types.append (wyliodrin_plot_type)
